import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Vendor } from '../../../../server/domain/entities';
import { SCMDButton } from '../../../common/interfaces/components/SCMDButton';
import { SCMDInput } from '../../../common/interfaces/components/SCMDInput';
import { SCMDCard } from '../../../common/interfaces/components/SCMDCard';
import { motion, AnimatePresence } from 'motion/react';

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vendorData: Partial<Vendor>) => Promise<void>;
  vendor?: Vendor | null;
}

export const VendorModal: React.FC<VendorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  vendor
}) => {
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.name || '',
        contactPerson: vendor.contact_person || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        address: vendor.address || ''
      });
    } else {
      setFormData({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: ''
      });
    }
  }, [vendor, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[var(--color-bg)]/80 backdrop-blur-md" 
        />
        
        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl z-10"
        >
          <SCMDCard className="!p-0 overflow-hidden !rounded-[32px] border-[var(--color-border)] shadow-2xl">
            {/* Header */}
            <div className="p-8 border-b border-[var(--color-border)]/10 bg-[var(--color-surface)]/30 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                  {vendor ? 'Chỉnh sửa Nhà thầu' : 'Đăng ký Nhà thầu mới'}
                </h3>
                <p className="text-[var(--color-text-secondary)] text-sm mt-1 font-medium italic-none">
                  Quản lý thông tin hồ sơ nhà thầu an ninh chuyên nghiệp.
                </p>
              </div>
              <button 
                onClick={onClose} 
                className="p-3 bg-[var(--gray-100)] hover:bg-[var(--gray-200)] rounded-2xl transition-all border border-[var(--color-border)]/20"
              >
                <X size={20} className="text-[var(--color-text-muted)]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-5">
                <SCMDInput
                  label="Tên Nhà Thầu *"
                  placeholder="Công ty CP Dịch vụ Bảo vệ..."
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <SCMDInput
                    label="Người liên hệ *"
                    placeholder="Nguyễn Văn A"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                    required
                  />
                  <SCMDInput
                    label="Số điện thoại *"
                    placeholder="09xx xxx xxx"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required
                  />
                </div>

                <SCMDInput
                  label="Email liên hệ *"
                  placeholder="contact@vendor.vn"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />

                <SCMDInput
                  label="Địa chỉ trụ sở"
                  placeholder="Số..., Quận..., TP..."
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>

              <div className="flex gap-4 pt-6 border-t border-[var(--color-border)]/10">
                <SCMDButton 
                  type="button" 
                  variant="ghost"
                  onClick={onClose}
                  className="flex-1 !rounded-2xl"
                >
                  Hủy bỏ
                </SCMDButton>
                <SCMDButton 
                  type="submit" 
                  isLoading={isLoading}
                  className="flex-1 !rounded-2xl !bg-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/20"
                >
                  LƯU THÔNG TIN
                </SCMDButton>
              </div>
            </form>
          </SCMDCard>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
