// ==UserScript==
// @name         Pokeclicker Pokemon Spawner
// @namespace    http://tampermonkey.net/
// @version      2025-08-11
// @description  UI เสกโปเกมอน ID 0–898 + เลือก Shiny หรือไม่
// @author       KSDPK
// @match        https://www.pokeclicker.com/
// @icon         https://www.google.com/s2/favicons?domain=pokeclicker.com
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    function waitForGameLoad(callback) {
        const checkInterval = setInterval(() => {
            if (typeof App !== 'undefined' && App.game && typeof App.game.party?.gainPokemonById === 'function') {
                clearInterval(checkInterval);
                callback();
            }
        }, 500);
    }

    function createUI() {
        const container = document.createElement("div");
        container.style.position = "fixed";
        container.style.top = "50px";
        container.style.left = "10px";
        container.style.zIndex = "9999";
        container.style.background = "rgba(0,0,0,0.85)";
        container.style.padding = "10px";
        container.style.borderRadius = "8px";
        container.style.color = "#fff";
        container.style.fontSize = "14px";
        container.style.width = "220px";

        container.innerHTML = `
            <h4 style="margin:0 0 5px 0; font-size:16px;">🐉 Pokemon Spawner</h4>
            <label>ID (0-898):</label>
            <input type="number" id="pokeId" value="140" min="0" max="898" style="width:100%; margin-bottom:5px;">
            <label><input type="checkbox" id="pokeShiny"> Shiny</label><br>
            <button id="spawnPokemon" style="width:100%; margin-top:5px;">เสกโปเกมอน</button>
        `;

        document.body.appendChild(container);

        document.getElementById("spawnPokemon").addEventListener("click", () => {
            const id = parseInt(document.getElementById("pokeId").value);
            const shiny = document.getElementById("pokeShiny").checked;

            if (id >= 0 && id <= 898) {
                App.game.party.gainPokemonById(id, shiny);
                notify(`✅ เสกโปเกมอน ID ${id} (${shiny ? '✨ Shiny' : 'ปกติ'})`);
            } else {
                notify(`❌ ID ต้องอยู่ระหว่าง 0-898`);
            }
        });
    }

    function notify(msg) {
        if (typeof Notifier !== 'undefined') {
            Notifier.notify({
                message: msg,
                type: NotificationConstants.NotificationOption.success
            });
        } else {
            console.log(msg);
        }
    }

    waitForGameLoad(createUI);
})();
