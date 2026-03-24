const { createApp } = Vue;

if (window.location.hostname === "localhost") {
	const target = new URL(window.location.href);
	target.hostname = "127.0.0.1";
	window.location.replace(target.toString());
}

const app = createApp(App);
app.use(router);
app.mount("#app");