import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@context/UserContext';
import { API_ENDPOINTS } from '@config/api';
import { apiClient, handleApiError } from '@utils/axiosConfig';
import NavigationBar from '@components/ui/NavigationBar';
import './Profile.css';

const passwordPolicy = {
	min: 8,
	req: [/[^a-zA-Z0-9]/, /[A-Z]/, /[0-9]/], // 특수문자 1+, 대문자 1+, 숫자 1+
};

const ProfileEdit: React.FC = () => {
	const { user, refresh } = useUser();
	const navigate = useNavigate();

	// 기본 정보 폼
	const [form, setForm] = useState({
		name: '',
		nickname: '',
		phoneNumber: '',
		birthDate: '',
		height: '',
		weight: '',
		age: '',
		gender: '',
	});
	const [saving, setSaving] = useState(false);

	// 비밀번호 변경 폼
	const [currentPw, setCurrentPw] = useState('');
	const [newPw, setNewPw] = useState('');
	const [confirmPw, setConfirmPw] = useState('');
	const [changingPw, setChangingPw] = useState(false);

	useEffect(() => {
		if (typeof refresh === 'function') refresh();
	}, []);

	useEffect(() => {
		if (!user) return;
		setForm({
			name: user.name || '',
			nickname: user.nickname || '',
			phoneNumber: user.phoneNumber || '',
			birthDate: user.birthDate || '',
			height: user.height || '',
			weight: user.weight || '',
			age: user.age || '',
			gender: user.gender || '',
		});
	}, [user?.id]);

	const policyError = useMemo(() => {
		if (!newPw) return '';
		if (newPw.length < passwordPolicy.min) return `비밀번호는 최소 ${passwordPolicy.min}자 이상이어야 합니다.`;
		if (!passwordPolicy.req[0].test(newPw)) return '특수문자를 최소 1개 포함해야 합니다.';
		if (!passwordPolicy.req[1].test(newPw)) return '대문자를 최소 1개 포함해야 합니다.';
		if (!passwordPolicy.req[2].test(newPw)) return '숫자를 최소 1개 포함해야 합니다.';
		if (user?.email && newPw.includes(user.email.split('@')[0])) return '이메일과 유사한 비밀번호는 사용할 수 없습니다.';
		return '';
	}, [newPw, user?.email]);

	const confirmError = useMemo(() => {
		if (!newPw && !confirmPw) return '';
		return newPw === confirmPw ? '' : '비밀번호 확인이 일치하지 않습니다.';
	}, [newPw, confirmPw]);

	const handleChange = (key: keyof typeof form, value: string) => {
		setForm(prev => ({ ...prev, [key]: value }));
	};

	const handleSaveBasic = async () => {
		try {
			setSaving(true);
			const response = await apiClient.put(API_ENDPOINTS.UPDATE_PROFILE, form);
			const data = response.data;
			if (!data?.success) throw new Error(data?.message || '수정 실패');
			alert('프로필이 저장되었습니다.');
			navigate('/profile');
		} catch (e: any) {
			const errorMessage = handleApiError(e);
			alert(errorMessage || '저장 중 오류가 발생했습니다.');
		} finally {
			setSaving(false);
		}
	};

	const handleChangePassword = async () => {
		if (!currentPw) return alert('현재 비밀번호를 입력해주세요.');
		if (newPw === currentPw) return alert('새 비밀번호는 현재 비밀번호와 달라야 합니다.');
		if (policyError) return alert(policyError);
		if (confirmError) return alert(confirmError);
		try {
			setChangingPw(true);
			const response = await apiClient.post(API_ENDPOINTS.CHANGE_PASSWORD, {
				currentPassword: currentPw,
				newPassword: newPw
			});
			const data = response.data;
			if (!data?.success) throw new Error(data?.message || '비밀번호 변경 실패');
			alert('비밀번호가 변경되었습니다.');
			setCurrentPw(''); setNewPw(''); setConfirmPw('');
		} catch (e: any) {
			const errorMessage = handleApiError(e);
			alert(errorMessage || '비밀번호 변경 중 오류가 발생했습니다.');
		} finally {
			setChangingPw(false);
		}
	};

	return (
		<div className="profile-container profile-edit">
			<div className="header">
				<div className="header-content content-wrapper">
					<div className="header-title">회원정보 수정</div>
					<div className="header-actions">
						<button className="settings-button" onClick={() => navigate('/profile')} aria-label="프로필로 돌아가기">←</button>
					</div>
				</div>
			</div>

			<div className="profile-content">
				<div className="basic-info" style={{ marginBottom: 16 }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<h3 className="info-title">기본 정보 수정</h3>
						<button className="action-button primary" onClick={handleSaveBasic} disabled={saving}>{saving ? '저장 중...' : '저장'}</button>
					</div>
					<div className="info-grid">
						<div className="info-item"><span className="info-label">이메일</span><span className="info-value">{user?.email || '-'}</span></div>
						<div className="info-item"><span className="info-label">로그인 방식</span><span className="info-value">{(user?.provider || 'local').toUpperCase()}</span></div>
						<div className="info-item"><span className="info-label">이름</span><input value={form.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="이름" /></div>
						<div className="info-item"><span className="info-label">닉네임</span><input value={form.nickname} onChange={(e) => handleChange('nickname', e.target.value)} placeholder="닉네임" /></div>
						<div className="info-item"><span className="info-label">휴대폰</span><input value={form.phoneNumber} onChange={(e) => handleChange('phoneNumber', e.target.value)} placeholder="010-0000-0000" /></div>
						<div className="info-item"><span className="info-label">생년월일</span><input value={form.birthDate} onChange={(e) => handleChange('birthDate', e.target.value)} placeholder="YYYYMMDD" /></div>
						<div className="info-item"><span className="info-label">키(cm)</span><input type="number" inputMode="decimal" value={form.height} onChange={(e) => handleChange('height', e.target.value)} placeholder="예: 175" /></div>
						<div className="info-item"><span className="info-label">체중(kg)</span><input type="number" inputMode="decimal" value={form.weight} onChange={(e) => handleChange('weight', e.target.value)} placeholder="예: 67.9" /></div>
						<div className="info-item"><span className="info-label">나이</span><input type="number" inputMode="numeric" value={form.age} onChange={(e) => handleChange('age', e.target.value)} placeholder="예: 28" /></div>
						<div className="info-item"><span className="info-label">성별</span>
							<select value={form.gender} onChange={(e) => handleChange('gender', e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--gray-300)', borderRadius: 8 }}>
								<option value="">선택</option>
								<option value="male">남</option>
								<option value="female">여</option>
								<option value="other">기타</option>
							</select>
						</div>
					</div>
					<div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
						<button className="action-button primary" onClick={handleSaveBasic} disabled={saving}>{saving ? '저장 중...' : '저장'}</button>
						<button className="action-button" onClick={() => navigate('/profile')}>취소</button>
					</div>
				</div>

				<div className="basic-info">
					<h3 className="info-title">비밀번호 변경</h3>
					<div className="info-grid">
						<div className="info-item"><span className="info-label">현재 비밀번호</span><input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} /></div>
						<div className="info-item"><span className="info-label">새 비밀번호</span><input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} /></div>
						<div className="info-item"><span className="info-label">새 비밀번호 확인</span><input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} /></div>
					</div>
					{policyError && <div style={{ color: '#d32f2f', marginTop: 8 }}>{policyError}</div>}
					{confirmError && !policyError && <div style={{ color: '#d32f2f', marginTop: 8 }}>{confirmError}</div>}
					<div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
						<button className="action-button primary" onClick={handleChangePassword} disabled={changingPw}>{changingPw ? '변경 중...' : '변경'}</button>
					</div>
				</div>
			</div>

			<NavigationBar />
		</div>
	);
};

export default ProfileEdit; 