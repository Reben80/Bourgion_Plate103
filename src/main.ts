import { mount } from "svelte"
import App from "./App.svelte"
import "./app.css"
import "@fontsource/literata/400.css"
import "@fontsource/literata/600.css"
import "@fontsource/literata/700.css"

const app = mount(App, { target: document.getElementById("app")! })

export default app
