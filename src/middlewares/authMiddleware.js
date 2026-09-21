const requireRole = (...allowedRoles) => {
    return (req,res,next) =>{
        const currentUser = req.session?.user || req.session?.advisor || req.session?.admin;

        if(!currentUser){
            return res.redirect("/login");
        }

        if(!allowedRoles.includes(currentUser.role)) {
            return res.status(403).send("Accès refusé : vous n'avez pas les autorisations requises pour accéder à cette page.");
        }
        req.user = currentUser;
        next();
    };
};

const requireClientAuth = requireRole("CLIENT");
const requireAdvisorAuth = requireRole("CHARGE_CLIENT");
const requireAdminAuth = requireRole("ADMINISTRATEUR");

module.exports = {
    requireRole,
    requireClientAuth,
    requireAdvisorAuth,
    requireAdminAuth
};