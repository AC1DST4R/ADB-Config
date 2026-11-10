import AdbWebUsb from "https://cdn.jsdelivr.net/npm/@yume-chan/adb@2.1.0/+esm";
import AdbWebUsbBackend from "https://cdn.jsdelivr.net/npm/@yume-chan/adb-backend-webusb@2.1.0/+esm";

const connectButton = document.getElementById("connect");
const initiateButton = document.getElementById("initiate");
const instructions = document.getElementById("instructions");
const deviceSection = document.getElementById("device");
const terminal = document.getElementById("terminal");
const output = document.getElementById("output");

let adb;

function log(message, color = "gray") {
    const line = document.createElement("div");
    line.className = color;
    line.textContent = message;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
}

async function shell(command) {
    const stream = await adb.subprocess.shell(command);
    const decoder = new TextDecoder();

    let result = "";

    for await (const chunk of stream) {
        result += decoder.decode(chunk);
    }

    return result;
}

connectButton.addEventListener("click", async () => {
    try {
        connectButton.disabled = true;
        connectButton.textContent = "WAITING FOR DEVICE...";

        const backend = await AdbWebUsbBackend.requestDevice();
        const connection = await backend.connect();

        adb = new AdbWebUsb(connection);

        const model = await shell("getprop ro.product.model");
        const manufacturer = await shell("getprop ro.product.manufacturer");
        const android = await shell("getprop ro.build.version.release");
        const sdk = await shell("getprop ro.build.version.sdk");
        const serial = await shell("getprop ro.serialno");

        instructions.style.display = "none";
        deviceSection.style.display = "block";

        document.getElementById("deviceInfo").innerHTML = `
            MODEL: ${escapeHTML(model.trim())}<br>
            MANUFACTURER: ${escapeHTML(manufacturer.trim())}<br>
            ANDROID: ${escapeHTML(android.trim())}<br>
            SDK: ${escapeHTML(sdk.trim())}<br>
            SERIAL: ${escapeHTML(serial.trim() || "Unavailable")}
        `;

    } catch (error) {
        connectButton.disabled = false;
        connectButton.textContent = "CONNECT DEVICE";
        alert("Device connection failed: " + error.message);
    }
});

function escapeHTML(value) {
    return value.replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

initiateButton.addEventListener("click", async () => {
    initiateButton.disabled = true;
    initiateButton.textContent = "EXECUTING...";
    terminal.style.display = "block";

    log("> Initializing ADB session...", "green");

    try {
        log("> Checking device authorization...", "yellow");

        const packages = await shell("pm list packages -3");

        log("> Third-party applications detected:", "green");

        const packageList = packages
            .split("\n")
            .map(line => line.replace("package:", "").trim())
            .filter(Boolean);

        packageList.forEach(pkg => log("  " + pkg));

        log("> Inspecting device administrator information...", "yellow");

        const admins = await shell("dumpsys device_policy");

        log("> Device administrator information retrieved.", "green");
        log(admins, "gray");

        log("> Operation complete. No applications were removed.", "green");
        log("> Review administrator assignments before removal.", "yellow");

    } catch (error) {
        log("> EXECUTION ERROR: " + error.message, "red");
    }

    initiateButton.textContent = "COMPLETED";
});
