import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Logout = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Clear token from storage
        localStorage.removeItem("token");

        // Redirect to login
        navigate("/login");
    }, [navigate]);

    return <div>Logging out...</div>;
};

export default Logout;
