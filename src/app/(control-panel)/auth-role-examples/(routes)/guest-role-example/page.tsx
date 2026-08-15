import AuthGuardRedirect from '@auth/AuthGuardRedirect';
import authRoles from '@auth/authRoles';
import GuestRoleExampleView from '../../components/views/GuestRoleExampleView';

function GuestRoleExamplePage() {
	return (
		<AuthGuardRedirect auth={authRoles.onlyGuest}>
			<GuestRoleExampleView />
		</AuthGuardRedirect>
	);
}

export default GuestRoleExamplePage;
