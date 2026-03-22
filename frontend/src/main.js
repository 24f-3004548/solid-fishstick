const { createApp } = Vue;

const app = createApp(App);
app.use(router);
app.mount("#app");