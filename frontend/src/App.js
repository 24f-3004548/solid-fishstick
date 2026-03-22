const App = {
  components: { Navbar },
  template: `
    <div class="app-layout">
      <Navbar />
      <main class="page-content">
        <router-view />
      </main>
    </div>
  `
};