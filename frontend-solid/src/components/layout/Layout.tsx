import { Component, JSX, children, Show } from 'solid-js'; // Import children helper, Show
import Sidebar from './Sidebar';
import Header from './Header';
import styles from './Layout.module.css'; // Import CSS Module (Typed)

const Layout: Component<{ children?: JSX.Element }> = (props) => { // Accept children prop
  // Mobile sidebar toggle state can be added here if needed
  const resolvedChildren = children(() => props.children); // Resolve children
  // console.log("Rendering MainLayout"); // Add log for debugging

  return (
    <div class={styles.layoutContainer}>
      <Sidebar /> {/* Sidebar is always visible in this layout */}

      <div class={styles.mainContentWrapper}>
        <Header />
        <main class={styles.mainArea}>
          <div class={styles.mainAreaInner}>
            {/* Render resolved children passed by the router */}
            {/* Use Show to wait for children to resolve if needed, though often not necessary here */}
            <Show when={resolvedChildren()}>
                {resolvedChildren()}
            </Show>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;