import { Component, JSX } from 'solid-js';
import styles from './AuthLayout.module.css'; // Import CSS Module (Typed)

interface AuthLayoutProps {
    children: JSX.Element;
}

const AuthLayout: Component<AuthLayoutProps> = (props) => {
    return (
        <div class={styles.authLayoutContainer}>
            {/* Optional inner wrapper for max-width could be added here */}
            {props.children}
        </div>
    );
};

export default AuthLayout;