import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './components/Login'
import Signup from './components/Signup'
import Logout from './components/Logout'
import BoardList from './components/BoardList'
import KanbanBoard from './components/KanbanBoard'
import OppositeRoleUsersPage from './components/OppositeRoleUsersPage'

const PrivateRoute = ({ children }) => {
    const { user, loading } = useAuth()

    if (loading) {
        return <div>Loading...</div>
    }

    return user ? children : <Navigate to="/login" />
}

const App = () => {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/logout" element={<Logout />} />
                    <Route path="/" element={
                        <PrivateRoute>
                            <BoardList />
                        </PrivateRoute>
                    } />
                    <Route path="/users/opposite-role" element={<OppositeRoleUsersPage />} />
                    <Route path="/board/:boardId" element={
                        <PrivateRoute>
                            <KanbanBoard />
                        </PrivateRoute>
                    } />
                </Routes>
            </Router>
        </AuthProvider>
    )
}

export default App