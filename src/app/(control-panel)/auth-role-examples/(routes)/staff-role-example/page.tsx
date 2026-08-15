import AuthGuardRedirect from '@auth/AuthGuardRedirect';
import authRoles from '@auth/authRoles';
import StaffRoleExampleView from '../../components/views/StaffRoleExampleView';

function StaffRoleExamplePage() {
	return (
		<AuthGuardRedirect auth={authRoles.staff}>
			<StaffRoleExampleView />
		</AuthGuardRedirect>
	);
}

export default StaffRoleExamplePage;
