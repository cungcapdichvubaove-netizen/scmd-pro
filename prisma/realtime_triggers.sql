-- Create a function to notify on patrol log insertion
CREATE OR REPLACE FUNCTION notify_patrol_log_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'patrol_log_event',
    json_build_object(
      'operation', TG_OP,
      'record', row_to_json(NEW)
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS patrol_log_after_insert ON patrol_logs;
CREATE TRIGGER patrol_log_after_insert
AFTER INSERT ON patrol_logs
FOR EACH ROW
EXECUTE FUNCTION notify_patrol_log_change();
