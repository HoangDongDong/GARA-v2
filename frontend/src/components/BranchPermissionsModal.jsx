import { useState, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  UserCheck,
  UserX,
  Building2,
  Search,
  RotateCcw,
  X,
  Info,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Check,
  Lock,
  Star
} from 'lucide-react';
import './BranchPermissionsModal.css';

export default function BranchPermissionsModal({
  members,
  branches = [],
  onClose,
  onSaveMember,
  onSaveEmployee,
  onRefresh,
  initialBranchId = ''
}) {
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'employees'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states cho Tab Tài khoản
  const [memberBranch, setMemberBranch] = useState(initialBranchId || branches[0]?.ID || '');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [isDefaultBranch, setIsDefaultBranch] = useState(false);

  // Form states cho Tab Nhân viên
  const [empBranch, setEmpBranch] = useState(initialBranchId || branches[0]?.ID || '');
  const [selectedEmp, setSelectedEmp] = useState('');

  // Bộ lọc bảng
  const [searchUser, setSearchUser] = useState('');
  const [filterUserBranch, setFilterUserBranch] = useState('all');
  const [filterUserStatus, setFilterUserStatus] = useState('all');

  const [searchEmp, setSearchEmp] = useState('');
  const [filterEmpBranch, setFilterEmpBranch] = useState('all');
  const [filterEmpStatus, setFilterEmpStatus] = useState('all');

  const notifySuccess = (msg) => {
    setSuccessMsg(msg);
    setError('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Tra cứu xem tài khoản đã có quyền ở chi nhánh đang chọn hay chưa
  const existingMembership = useMemo(() => {
    if (!members?.data || !selectedUser || !memberBranch) return null;
    return members.data.find(
      (m) => m.SUSERID === selectedUser && m.DCUAHANGID === memberBranch
    );
  }, [members?.data, selectedUser, memberBranch]);

  // Xử lý nạp dữ liệu khi người dùng chọn tài khoản trong form
  const handleUserChange = (userId) => {
    setSelectedUser(userId);
    if (!userId || !memberBranch) {
      setSelectedGroup('');
      setIsDefaultBranch(false);
      return;
    }
    const match = members?.data?.find(
      (m) => m.SUSERID === userId && m.DCUAHANGID === memberBranch
    );
    if (match) {
      setSelectedGroup(match.SGROUPUSERID || '');
      setIsDefaultBranch(Number(match.ISDEFAULT) === 1);
    } else {
      setSelectedGroup('');
      setIsDefaultBranch(false);
    }
  };

  // Xử lý nạp dữ liệu khi người dùng đổi chi nhánh trong form phân quyền
  const handleMemberBranchChange = (branchId) => {
    setMemberBranch(branchId);
    if (!selectedUser || !branchId) return;
    const match = members?.data?.find(
      (m) => m.SUSERID === selectedUser && m.DCUAHANGID === branchId
    );
    if (match) {
      setSelectedGroup(match.SGROUPUSERID || '');
      setIsDefaultBranch(Number(match.ISDEFAULT) === 1);
    } else {
      setSelectedGroup('');
      setIsDefaultBranch(false);
    }
  };

  // Bấm Sửa trực tiếp trên bảng tài khoản
  const handleEditMemberRow = (row) => {
    setMemberBranch(row.DCUAHANGID);
    setSelectedUser(row.SUSERID);
    setSelectedGroup(row.SGROUPUSERID || '');
    setIsDefaultBranch(Number(row.ISDEFAULT) === 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cấp / Cập nhật quyền tài khoản
  const handleSaveMember = async (status = 1, customData = null) => {
    const uId = customData?.userId || selectedUser;
    const bId = customData?.branchId || memberBranch;
    const gId = customData ? customData.groupId : (selectedGroup || null);
    const def = customData ? customData.isDefault : isDefaultBranch;

    if (!uId || !bId) {
      setError('Vui lòng chọn cả chi nhánh và tài khoản.');
      return;
    }

    const currentMem = members?.data?.find(
      (m) => m.SUSERID === uId && m.DCUAHANGID === bId
    );

    setBusy(true);
    setError('');
    try {
      await onSaveMember(
        uId,
        bId,
        gId,
        status,
        def,
        currentMem?.VERSION ?? null
      );
      notifySuccess(
        status === 1
          ? 'Đã cấp quyền truy cập chi nhánh thành công!'
          : 'Đã thu hồi quyền truy cập chi nhánh!'
      );
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  };

  // Phân công / Ngừng phân công nhân viên
  const handleSaveEmployee = async (status = 1, customData = null) => {
    const eId = customData?.employeeId || selectedEmp;
    const bId = customData?.branchId || empBranch;

    if (!eId || !bId) {
      setError('Vui lòng chọn cả chi nhánh và nhân viên.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await onSaveEmployee(eId, bId, status);
      notifySuccess(
        status === 1
          ? 'Đã phân công nhân viên vào chi nhánh thành công!'
          : 'Đã ngừng phân công nhân viên tại chi nhánh!'
      );
      if (!customData) {
        setSelectedEmp('');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  };

  // Map danh sách nhân viên phân công kèm tên
  const employeeAssignments = useMemo(() => {
    if (!members?.assignments) return [];
    const empMap = new Map((members.employees || []).map((e) => [e.ID, e.NAME]));
    const branchMap = new Map((branches || []).map((b) => [b.ID, b.NAME]));

    return members.assignments.map((item, idx) => ({
      id: `${item.DNHANVIENID}_${item.DCUAHANGID}_${idx}`,
      employeeId: item.DNHANVIENID,
      branchId: item.DCUAHANGID,
      employeeName: empMap.get(item.DNHANVIENID) || 'Không xác định',
      branchName: branchMap.get(item.DCUAHANGID) || 'Chi nhánh khác',
      status: Number(item.STATUS)
    }));
  }, [members?.assignments, members?.employees, branches]);

  // Lọc bảng tài khoản
  const filteredMembers = useMemo(() => {
    if (!members?.data) return [];
    return members.data.filter((item) => {
      const matchSearch =
        !searchUser ||
        (item.USERNAME || '').toLowerCase().includes(searchUser.toLowerCase()) ||
        (item.NAME || '').toLowerCase().includes(searchUser.toLowerCase()) ||
        (item.BRANCHNAME || '').toLowerCase().includes(searchUser.toLowerCase());

      const matchBranch =
        filterUserBranch === 'all' || item.DCUAHANGID === filterUserBranch;

      const matchStatus =
        filterUserStatus === 'all' ||
        (filterUserStatus === 'active' ? item.STATUS === 1 : item.STATUS === 0);

      return matchSearch && matchBranch && matchStatus;
    });
  }, [members?.data, searchUser, filterUserBranch, filterUserStatus]);

  // Lọc bảng nhân viên
  const filteredEmployees = useMemo(() => {
    return employeeAssignments.filter((item) => {
      const matchSearch =
        !searchEmp ||
        item.employeeName.toLowerCase().includes(searchEmp.toLowerCase()) ||
        item.branchName.toLowerCase().includes(searchEmp.toLowerCase());

      const matchBranch =
        filterEmpBranch === 'all' || item.branchId === filterEmpBranch;

      const matchStatus =
        filterEmpStatus === 'all' ||
        (filterEmpStatus === 'active' ? item.status === 1 : item.status === 0);

      return matchSearch && matchBranch && matchStatus;
    });
  }, [employeeAssignments, searchEmp, filterEmpBranch, filterEmpStatus]);

  return (
    <div
      className="branch-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Phân quyền chi nhánh"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="branch-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* ===== HEADER ===== */}
        <header className="branch-modal-header">
          <div className="branch-modal-header-left">
            <div className="branch-modal-header-icon">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="branch-modal-title">Phân Quyền & Phân Công Chi Nhánh</h2>
              <p className="branch-modal-subtitle">
                Quản lý quyền truy cập của tài khoản đăng nhập và phân bổ nhân sự làm việc theo từng chi nhánh gara.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="branch-modal-close-btn"
            aria-label="Đóng cửa sổ"
            disabled={busy}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        {/* ===== NAVIGATION TABS ===== */}
        <nav className="branch-modal-nav" aria-label="Tab phân quyền">
          <button
            type="button"
            className={`branch-tab-btn ${activeTab === 'members' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveTab('members');
              setError('');
            }}
          >
            <Lock size={15} />
            <span>Phân quyền tài khoản</span>
            <span className="branch-tab-badge">{members?.data?.length || 0}</span>
          </button>

          <button
            type="button"
            className={`branch-tab-btn ${activeTab === 'employees' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveTab('employees');
              setError('');
            }}
          >
            <Users size={15} />
            <span>Phân công nhân viên</span>
            <span className="branch-tab-badge">{employeeAssignments.length}</span>
          </button>
        </nav>

        {/* ===== BODY CONTENT ===== */}
        <div className="branch-modal-body">
          {/* Thông báo thông tin nguyên tắc */}
          <div className="branch-modal-notice">
            <Info size={16} />
            <div>
              <strong>Quy tắc hệ thống:</strong> Tài khoản Quản trị / Chủ có toàn quyền xem và quản lý tất cả chi nhánh.
              Nhân viên chỉ có thể đăng nhập và thao tác tại những chi nhánh được cấp phép.
            </div>
          </div>

          {/* Alert Error / Success */}
          {error && (
            <div className="branch-modal-alert error" role="alert">
              <div className="branch-modal-alert-content">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
              <button
                type="button"
                className="branch-modal-close-btn"
                style={{ width: 24, height: 24 }}
                onClick={() => setError('')}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {successMsg && (
            <div className="branch-modal-alert success" role="status">
              <div className="branch-modal-alert-content">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
              <button
                type="button"
                className="branch-modal-close-btn"
                style={{ width: 24, height: 24 }}
                onClick={() => setSuccessMsg('')}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* ===== TAB 1: PHÂN QUYỀN TÀI KHOẢN ===== */}
          {activeTab === 'members' && (
            <>
              {/* Card Form Cấp quyền */}
              <section className="branch-action-card">
                <div className="branch-card-heading">
                  <h3 className="branch-card-title">
                    <UserCheck size={17} />
                    <span>Thiết lập quyền truy cập chi nhánh</span>
                  </h3>
                  <span className="branch-card-subtitle">
                    {existingMembership
                      ? existingMembership.STATUS === 1
                        ? 'Tài khoản này đang có quyền tại chi nhánh'
                        : 'Tài khoản này đã bị thu hồi quyền tại chi nhánh'
                      : 'Cấp quyền mới cho tài khoản'}
                  </span>
                </div>

                <div className="branch-form-grid">
                  {/* Chi nhánh */}
                  <div className="branch-form-field">
                    <label className="branch-form-label" htmlFor="mem-branch-select">
                      <Building2 size={14} />
                      <span>Chi nhánh thao tác</span>
                      <span className="required">*</span>
                    </label>
                    <div className="branch-input-wrapper">
                      <select
                        id="mem-branch-select"
                        className="branch-select"
                        value={memberBranch}
                        onChange={(e) => handleMemberBranchChange(e.target.value)}
                        disabled={busy}
                      >
                        <option value="">-- Chọn chi nhánh áp dụng --</option>
                        {branches.map((b) => (
                          <option key={b.ID} value={b.ID}>
                            {b.NAME} ({b.CODE})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Tài khoản */}
                  <div className="branch-form-field">
                    <label className="branch-form-label" htmlFor="mem-user-select">
                      <Lock size={14} />
                      <span>Tài khoản người dùng</span>
                      <span className="required">*</span>
                    </label>
                    <div className="branch-input-wrapper">
                      <select
                        id="mem-user-select"
                        className="branch-select"
                        value={selectedUser}
                        onChange={(e) => handleUserChange(e.target.value)}
                        disabled={busy}
                      >
                        <option value="">-- Chọn tài khoản người dùng --</option>
                        {members?.users?.map((u) => (
                          <option key={u.ID} value={u.ID}>
                            {u.USERNAME} — {u.NAME || 'Chưa đặt tên'} ({u.ORGROLE || 'Nhân viên'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Nhóm quyền */}
                  <div className="branch-form-field">
                    <label className="branch-form-label" htmlFor="mem-group-select">
                      <ShieldCheck size={14} />
                      <span>Nhóm vai trò / quyền tại chi nhánh</span>
                    </label>
                    <div className="branch-input-wrapper">
                      <select
                        id="mem-group-select"
                        className="branch-select"
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                        disabled={busy}
                      >
                        <option value="">Mặc định theo nhóm quyền của tài khoản</option>
                        {members?.groups?.map((g) => (
                          <option key={g.ID} value={g.ID}>
                            {g.NAME}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Checkbox Chi nhánh mặc định */}
                <div>
                  <label className="branch-checkbox-label">
                    <input
                      type="checkbox"
                      checked={isDefaultBranch}
                      onChange={(e) => setIsDefaultBranch(e.target.checked)}
                      disabled={busy || !selectedUser}
                    />
                    <span>Đặt làm chi nhánh mặc định khi tài khoản này đăng nhập</span>
                  </label>
                </div>

                {/* Hàng nút bấm */}
                <div className="branch-form-actions">
                  <button
                    type="button"
                    className="branch-btn branch-btn-primary"
                    disabled={busy || !selectedUser || !memberBranch}
                    onClick={() => handleSaveMember(1)}
                  >
                    <Check size={15} />
                    <span>{busy ? 'Đang lưu…' : existingMembership?.STATUS === 1 ? 'Cập nhật phân quyền' : 'Cấp quyền truy cập'}</span>
                  </button>

                  {existingMembership && existingMembership.STATUS === 1 && (
                    <button
                      type="button"
                      className="branch-btn branch-btn-revoke"
                      disabled={busy}
                      onClick={() => handleSaveMember(0)}
                    >
                      <ShieldAlert size={15} />
                      <span>Thu hồi quyền chi nhánh này</span>
                    </button>
                  )}

                  {(selectedUser || selectedGroup) && (
                    <button
                      type="button"
                      className="branch-btn branch-btn-ghost"
                      disabled={busy}
                      onClick={() => {
                        setSelectedUser('');
                        setSelectedGroup('');
                        setIsDefaultBranch(false);
                      }}
                    >
                      <RotateCcw size={14} />
                      <span>Hủy chọn</span>
                    </button>
                  )}
                </div>
              </section>

              {/* Bảng Danh sách Phân quyền Tài khoản */}
              <section className="branch-table-section">
                <div className="branch-table-header">
                  <h4 className="branch-table-title">
                    <ShieldCheck size={16} />
                    <span>Danh sách tài khoản được cấp quyền ({filteredMembers.length})</span>
                  </h4>

                  <div className="branch-table-controls">
                    {/* Search */}
                    <div className="branch-search-box">
                      <Search size={14} />
                      <input
                        type="search"
                        placeholder="Tìm tên, tài khoản, chi nhánh…"
                        value={searchUser}
                        onChange={(e) => setSearchUser(e.target.value)}
                      />
                    </div>

                    {/* Filter Chi nhánh */}
                    <select
                      className="branch-filter-select"
                      aria-label="Lọc theo chi nhánh"
                      value={filterUserBranch}
                      onChange={(e) => setFilterUserBranch(e.target.value)}
                    >
                      <option value="all">Tất cả chi nhánh</option>
                      {branches.map((b) => (
                        <option key={b.ID} value={b.ID}>
                          {b.NAME}
                        </option>
                      ))}
                    </select>

                    {/* Filter Trạng thái */}
                    <select
                      className="branch-filter-select"
                      aria-label="Lọc theo trạng thái"
                      value={filterUserStatus}
                      onChange={(e) => setFilterUserStatus(e.target.value)}
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="active">Được truy cập</option>
                      <option value="inactive">Đã thu hồi</option>
                    </select>
                  </div>
                </div>

                <div className="branch-table-wrap">
                  <table className="branch-table">
                    <thead>
                      <tr>
                        <th style={{ width: 44, textAlign: 'center' }}>STT</th>
                        <th>Tài khoản</th>
                        <th>Chi nhánh</th>
                        <th>Nhóm quyền áp dụng</th>
                        <th style={{ textAlign: 'center' }}>Trạng thái</th>
                        <th style={{ textAlign: 'center', width: 140 }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((item, idx) => {
                        const groupObj = members?.groups?.find((g) => g.ID === item.SGROUPUSERID);
                        const isSelected = item.SUSERID === selectedUser && item.DCUAHANGID === memberBranch;

                        return (
                          <tr
                            key={item.ID || `${item.SUSERID}_${item.DCUAHANGID}`}
                            style={isSelected ? { background: '#fff7ed' } : undefined}
                          >
                            <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <strong style={{ color: '#0f172a' }}>{item.NAME || item.USERNAME}</strong>
                                <span style={{ fontSize: 11, color: '#64748b' }}>
                                  @{item.USERNAME}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>{item.BRANCHNAME}</span>
                                {Number(item.ISDEFAULT) === 1 && (
                                  <span className="branch-badge default-tag" title="Chi nhánh mặc định khi đăng nhập">
                                    <Star size={10} /> Mặc định
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              {groupObj ? (
                                <span className="branch-badge role-tag">{groupObj.NAME}</span>
                              ) : (
                                <span style={{ color: '#64748b', fontStyle: 'italic', fontSize: 12 }}>
                                  Theo nhóm tài khoản
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {item.STATUS === 1 ? (
                                <span className="branch-badge active">
                                  <CheckCircle2 size={12} /> Được truy cập
                                </span>
                              ) : (
                                <span className="branch-badge revoked">
                                  <AlertCircle size={12} /> Đã thu hồi
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div className="branch-row-actions" style={{ justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  className="branch-mini-btn"
                                  title="Chọn để chỉnh sửa trên form"
                                  disabled={busy}
                                  onClick={() => handleEditMemberRow(item)}
                                >
                                  <Pencil size={12} /> Sửa
                                </button>

                                {item.STATUS === 1 ? (
                                  <button
                                    type="button"
                                    className="branch-mini-btn danger"
                                    title="Thu hồi quyền truy cập"
                                    disabled={busy}
                                    onClick={() =>
                                      handleSaveMember(0, {
                                        userId: item.SUSERID,
                                        branchId: item.DCUAHANGID,
                                        groupId: item.SGROUPUSERID,
                                        isDefault: Number(item.ISDEFAULT) === 1
                                      })
                                    }
                                  >
                                    Thu hồi
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="branch-mini-btn primary"
                                    title="Cấp lại quyền truy cập"
                                    disabled={busy}
                                    onClick={() =>
                                      handleSaveMember(1, {
                                        userId: item.SUSERID,
                                        branchId: item.DCUAHANGID,
                                        groupId: item.SGROUPUSERID,
                                        isDefault: Number(item.ISDEFAULT) === 1
                                      })
                                    }
                                  >
                                    Cấp lại
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {filteredMembers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="branch-table-empty">
                            Không có dữ liệu phân quyền tài khoản nào phù hợp với bộ lọc.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {/* ===== TAB 2: PHÂN CÔNG NHÂN VIÊN ===== */}
          {activeTab === 'employees' && (
            <>
              {/* Card Form Phân công Nhân viên */}
              <section className="branch-action-card">
                <div className="branch-card-heading">
                  <h3 className="branch-card-title">
                    <Users size={17} />
                    <span>Phân bổ nhân viên làm việc</span>
                  </h3>
                  <span className="branch-card-subtitle">
                    Gán kỹ thuật viên, nhân viên cố vấn hoặc bán hàng vào cơ sở làm việc
                  </span>
                </div>

                <div className="branch-form-grid">
                  {/* Chi nhánh */}
                  <div className="branch-form-field">
                    <label className="branch-form-label" htmlFor="emp-branch-select">
                      <Building2 size={14} />
                      <span>Chi nhánh làm việc</span>
                      <span className="required">*</span>
                    </label>
                    <div className="branch-input-wrapper">
                      <select
                        id="emp-branch-select"
                        className="branch-select"
                        value={empBranch}
                        onChange={(e) => setEmpBranch(e.target.value)}
                        disabled={busy}
                      >
                        <option value="">-- Chọn chi nhánh làm việc --</option>
                        {branches.map((b) => (
                          <option key={b.ID} value={b.ID}>
                            {b.NAME} ({b.CODE})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Nhân viên */}
                  <div className="branch-form-field">
                    <label className="branch-form-label" htmlFor="emp-select">
                      <Users size={14} />
                      <span>Chọn nhân viên</span>
                      <span className="required">*</span>
                    </label>
                    <div className="branch-input-wrapper">
                      <select
                        id="emp-select"
                        className="branch-select"
                        value={selectedEmp}
                        onChange={(e) => setSelectedEmp(e.target.value)}
                        disabled={busy}
                      >
                        <option value="">-- Chọn nhân viên trong gara --</option>
                        {members?.employees?.map((n) => (
                          <option key={n.ID} value={n.ID}>
                            {n.NAME}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Hàng nút bấm */}
                <div className="branch-form-actions">
                  <button
                    type="button"
                    className="branch-btn branch-btn-primary"
                    disabled={busy || !selectedEmp || !empBranch}
                    onClick={() => handleSaveEmployee(1)}
                  >
                    <UserCheck size={15} />
                    <span>{busy ? 'Đang lưu…' : 'Phân vào chi nhánh'}</span>
                  </button>

                  <button
                    type="button"
                    className="branch-btn branch-btn-revoke"
                    disabled={busy || !selectedEmp || !empBranch}
                    onClick={() => handleSaveEmployee(0)}
                  >
                    <UserX size={15} />
                    <span>Ngừng phân công tại chi nhánh này</span>
                  </button>

                  {selectedEmp && (
                    <button
                      type="button"
                      className="branch-btn branch-btn-ghost"
                      disabled={busy}
                      onClick={() => setSelectedEmp('')}
                    >
                      <RotateCcw size={14} />
                      <span>Hủy chọn</span>
                    </button>
                  )}
                </div>
              </section>

              {/* Bảng Danh sách Phân công Nhân viên */}
              <section className="branch-table-section">
                <div className="branch-table-header">
                  <h4 className="branch-table-title">
                    <Users size={16} />
                    <span>Danh sách phân công nhân viên ({filteredEmployees.length})</span>
                  </h4>

                  <div className="branch-table-controls">
                    {/* Search */}
                    <div className="branch-search-box">
                      <Search size={14} />
                      <input
                        type="search"
                        placeholder="Tìm tên nhân viên, chi nhánh…"
                        value={searchEmp}
                        onChange={(e) => setSearchEmp(e.target.value)}
                      />
                    </div>

                    {/* Filter Chi nhánh */}
                    <select
                      className="branch-filter-select"
                      aria-label="Lọc theo chi nhánh"
                      value={filterEmpBranch}
                      onChange={(e) => setFilterEmpBranch(e.target.value)}
                    >
                      <option value="all">Tất cả chi nhánh</option>
                      {branches.map((b) => (
                        <option key={b.ID} value={b.ID}>
                          {b.NAME}
                        </option>
                      ))}
                    </select>

                    {/* Filter Trạng thái */}
                    <select
                      className="branch-filter-select"
                      aria-label="Lọc theo trạng thái"
                      value={filterEmpStatus}
                      onChange={(e) => setFilterEmpStatus(e.target.value)}
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="active">Đang phân công</option>
                      <option value="inactive">Đã ngừng</option>
                    </select>
                  </div>
                </div>

                <div className="branch-table-wrap">
                  <table className="branch-table">
                    <thead>
                      <tr>
                        <th style={{ width: 44, textAlign: 'center' }}>STT</th>
                        <th>Họ và tên nhân viên</th>
                        <th>Chi nhánh làm việc</th>
                        <th style={{ textAlign: 'center' }}>Trạng thái</th>
                        <th style={{ textAlign: 'center', width: 140 }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((item, idx) => {
                        const isSelected = item.employeeId === selectedEmp && item.branchId === empBranch;

                        return (
                          <tr
                            key={item.id}
                            style={isSelected ? { background: '#fff7ed' } : undefined}
                          >
                            <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                            <td>
                              <strong style={{ color: '#0f172a' }}>{item.employeeName}</strong>
                            </td>
                            <td>
                              <span>{item.branchName}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {item.status === 1 ? (
                                <span className="branch-badge active">
                                  <CheckCircle2 size={12} /> Đang làm việc
                                </span>
                              ) : (
                                <span className="branch-badge revoked">
                                  <AlertCircle size={12} /> Ngừng phân công
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div className="branch-row-actions" style={{ justifyContent: 'center' }}>
                                {item.status === 1 ? (
                                  <button
                                    type="button"
                                    className="branch-mini-btn danger"
                                    title="Ngừng phân công làm việc tại chi nhánh này"
                                    disabled={busy}
                                    onClick={() =>
                                      handleSaveEmployee(0, {
                                        employeeId: item.employeeId,
                                        branchId: item.branchId
                                      })
                                    }
                                  >
                                    Ngừng
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="branch-mini-btn primary"
                                    title="Phân công lại vào chi nhánh"
                                    disabled={busy}
                                    onClick={() =>
                                      handleSaveEmployee(1, {
                                        employeeId: item.employeeId,
                                        branchId: item.branchId
                                      })
                                    }
                                  >
                                    Phân lại
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {filteredEmployees.length === 0 && (
                        <tr>
                          <td colSpan={5} className="branch-table-empty">
                            Không có dữ liệu phân công nhân viên nào phù hợp với bộ lọc.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>

        {/* ===== FOOTER ===== */}
        <footer className="branch-modal-footer">
          <div className="branch-modal-footer-stats">
            <span>
              Tổng số tài khoản: <strong>{members?.users?.length || 0}</strong>
            </span>
            <span>•</span>
            <span>
              Tổng số nhân viên: <strong>{members?.employees?.length || 0}</strong>
            </span>
            <span>•</span>
            <span>
              Chi nhánh: <strong>{branches.length} cơ sở</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {onRefresh && (
              <button
                type="button"
                className="branch-btn branch-btn-ghost"
                disabled={busy}
                onClick={onRefresh}
                title="Tải lại dữ liệu mới nhất từ máy chủ"
              >
                <RotateCcw size={14} />
                <span>Tải lại</span>
              </button>
            )}

            <button
              type="button"
              className="branch-btn branch-btn-primary"
              disabled={busy}
              onClick={onClose}
            >
              <span>Đóng cửa sổ</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
