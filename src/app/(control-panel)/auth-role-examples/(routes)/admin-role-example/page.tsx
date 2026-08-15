import AuthGuardRedirect from '@auth/AuthGuardRedirect';
import authRoles from '@auth/authRoles';
import AdminRoleExampleView from '../../components/views/AdminRoleExampleView';

function AdminRoleExamplePage() {
	return (
		<AuthGuardRedirect auth={authRoles.admin}>
			<AdminRoleExampleView />
		</AuthGuardRedirect>
	);
}

export default AdminRoleExamplePage;
