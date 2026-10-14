import { useState } from 'react';
import { ShieldCheck, Building2, Store } from 'lucide-react';
import api from '../api';
import BranchSettings from './BranchSettings';
import InventoryTransfers from './InventoryTransfers';
import BranchPermissionsModal from './BranchPermissionsModal';
import { branchId, selectBranch } from '../utils/branchSession';

export default function BranchToolbar({ user, mode = 'selection' }) {
  const [members, setMembers] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const branches = user.BRANCHES || [];
  const owner = ['OWNER', 'ORG_ADMIN'].includes(user.ORGROLE);

  if (!branches.length) return null;

  async function load() {
    setLoading(true);
    try {
      setError('');
      const r = await api.get('/branches/members');
      setMembers(r.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveMember(userId, bId, groupId, status, isDefault, version) {
    await api.put('/branches/members', {
      userId,
      branchId: bId,
      groupId: groupId || null,
      status,
      isDefault: !!isDefault,
      version: version ?? null
    });
    await load();
  }

  async function handleSaveEmployee(employeeId, bId, status) {
    await api.put('/branches/employees', {
      employeeId,
      branchId: bId,
      status
    });
    await load();
  }

  return (
    <div
      style={{
        padding: '10px 14px',
        marginBottom: 12,
        border: '1px solid #fed7aa',
        borderRadius: 10,
        background: '#fffaf5',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}
    >
      {mode === 'selection' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Store size={16} color="#ea580c" />
          <strong style={{ fontSize: 13, color: '#334155' }}>Chi nhánh:</strong>
          <select
            aria-label="Chi nhánh làm việc"
            value={branchId()}
            onChange={(e) => {
              if (
                window.confirm(
                  'Đổi chi nhánh sẽ tải lại trang. Hãy lưu phiếu đang nhập trước khi tiếp tục.'
                )
              ) {
                selectBranch(e.target.value);
              }
            }}
            style={{
              maxWidth: 340,
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12.5,
              background: '#fff',
              color: '#0f172a',
              outline: 'none'
            }}
          >
            {branches.map((b) => (
              <option key={b.ID} value={b.ID}>
                {b.NAME} ({b.CODE})
                {Number(b.STATUS) === 0 ? ' · ngừng sử dụng, chỉ xem' : ''}
              </option>
            ))}
            {owner && <option value="all">Tất cả chi nhánh · chỉ xem</option>}
          </select>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 size={16} color="#ea580c" />
          <strong style={{ fontSize: 13, color: '#0f172a' }}>
            Chi nhánh:{' '}
            <span style={{ color: '#ea580c' }}>
              {branches.find((b) => b.ID === branchId())?.NAME ||
                'Tất cả chi nhánh · chỉ xem'}
            </span>
          </strong>
        </div>
      )}

      {branchId() === 'all' && (
        <span style={{ fontSize: 12, color: '#64748b' }}>
          Đang xem tổng hợp. Chọn một chi nhánh để tạo hoặc cập nhật phiếu.
        </span>
      )}

      {mode === 'management' && owner && <BranchSettings />}
      {mode === 'management' &&
        (Number(user.ISADMIN) === 1 ||
          Number(user.PERMISSIONS?.INVENTORY || 0) & 1) && (
          <InventoryTransfers />
        )}

      {mode === 'management' && owner && (
        <button
          type="button"
          onClick={load}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #ea580c',
            background: '#ffffff',
            color: '#ea580c',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#fff7ed';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ffffff';
          }}
        >
          <ShieldCheck size={15} />
          <span>{loading ? 'Đang tải…' : 'Phân quyền chi nhánh'}</span>
        </button>
      )}

      {error && !members && (
        <span role="alert" style={{ color: '#dc2626', fontSize: 12 }}>
          {error}
        </span>
      )}

      {/* MODAL PHÂN QUYỀN MỚI CHUẨN ĐẸP HIỆN ĐẠI */}
      {members && (
        <BranchPermissionsModal
          members={members}
          branches={branches}
          initialBranchId={branchId() !== 'all' ? branchId() : ''}
          onClose={() => setMembers(null)}
          onSaveMember={handleSaveMember}
          onSaveEmployee={handleSaveEmployee}
          onRefresh={load}
        />
      )}
    </div>
  );
}
