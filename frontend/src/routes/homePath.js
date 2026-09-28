export const homePathFor = (user) =>
  user?.is_admin ? "/admin" : user?.is_employer ? "/employer/dashboard" : "/dashboard";
