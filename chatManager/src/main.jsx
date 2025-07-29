import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ChatDashboard from './ChatDashboard.jsx'
import './index.css'

const router = createBrowserRouter([
    {
        path: "/",
        element: <ChatDashboard />,
    },
    {
        path: "/chat-manager",
        element: <ChatDashboard />,
    },
    {
        path: "/chat-manager/",
        element: <ChatDashboard />,
    },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <RouterProvider router={router} />
    </React.StrictMode>,
) 