(function () {
    'use strict';

    const SCRIPT_NAME = "Pokéclicker Helper";
    const VERSION = "1.4.2"; // ลบ Evolution Items ออก

    const CONTAINER_ID = "poke-helper-container";
    let gameReady = false;

    // ใช้สำหรับ autocomplete / ค้นหาแบบไม่เคร่งตัวพิมพ์
    let itemIndex = new Map();
    let itemListReady = false;

    const currencies = [
        { name: "Pokédollars", method: amount => App.game.wallet.gainMoney(amount) },
        { name: "Dungeon Tokens", method: amount => App.game.wallet.gainDungeonTokens(amount) },
        { name: "Quest Points", method: amount => App.game.wallet.gainQuestPoints(amount) },
        { name: "Farm Points", method: amount => App.game.wallet.gainFarmPoints(amount) },
        { name: "Diamonds", method: amount => App.game.wallet.gainDiamonds(amount) },
        { name: "Battle Points", method: amount => App.game.wallet.gainBattlePoints(amount) },
        { name: "Contest Tokens", method: amount => App.game.wallet.gainContestTokens(amount) },
    ];

    function waitForGameLoad(onReady) {
        const t = setInterval(() => {
            if (
                typeof App !== 'undefined' &&
                App.game &&
                typeof App.game.party?.gainPokemonById === 'function' &&
                App.game.wallet &&
                typeof ItemList !== 'undefined'
            ) {
                clearInterval(t);
                gameReady = true;
                buildItemIndex();
                onReady?.();
            }
        }, 500);
    }

    function buildItemIndex() {
        try {
            itemIndex.clear();
            const keys = Object.keys(ItemList || {});
            for (const k of keys) {
                const norm = normalizeKey(k).toLowerCase();
                if (!itemIndex.has(norm)) itemIndex.set(norm, k);
            }
            itemListReady = true;
        } catch (e) {
            console.warn("buildItemIndex error:", e);
            itemListReady = false;
        }
    }

    function normalizeKey(s) {
        return String(s || '').trim().replace(/\s+/g, '_');
    }

    function resolveItemKey(inputName) {
        const norm = normalizeKey(inputName).toLowerCase();
        if (itemIndex.has(norm)) return itemIndex.get(norm);
        if (ItemList[normalizeKey(inputName)]) return normalizeKey(inputName);
        return null;
    }

    function createUI() {
        const existing = document.getElementById(CONTAINER_ID);
        if (existing) return existing;

        const container = document.createElement("div");
        container.id = CONTAINER_ID;
        Object.assign(container.style, {
            position: "fixed",
            top: "50px",
            left: "10px",
            zIndex: "9999",
            background: "rgba(0,0,0,0.85)",
            padding: "10px",
            borderRadius: "8px",
            color: "#fff",
            fontSize: "14px",
            width: "280px",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
            backdropFilter: "blur(2px)"
        });

        let html = `
            <h4 style="margin:0 0 5px 0; font-size:16px;">
                🐉 ${SCRIPT_NAME} <span style="opacity:.7;font-size:12px;">v${VERSION}</span>
            </h4>
            <label>ID (1-898):</label>
            <input type="number" id="pokeId" value="1" min="1" max="898" style="width:100%; margin-bottom:5px;">
            <label style="display:inline-flex;align-items:center;gap:6px;">
                <input type="checkbox" id="pokeShiny"> Shiny
            </label><br>
            <button id="spawnPokemon" style="width:100%; margin-top:5px; margin-bottom:10px;">
                เสกโปเกมอน
            </button>
        `;

        html += `
            <h4 style="margin:10px 0 5px 0;font-size:16px;">💰 Currency Adder</h4>
            <label>เลือกสกุลเงิน:</label>
            <select id="currencySelect" style="width:100%;margin-bottom:5px;">
                ${currencies.map((c, i) => `<option value="${i}">${c.name}</option>`).join('')}
            </select>
            <label>จำนวน:</label>
            <input type="number" id="currencyAmount" value="1000" min="1" style="width:100%;margin-bottom:5px;">
            <button id="addCurrency" style="width:100%;">เพิ่ม</button>
        `;

        html += `
            <h4 style="margin:10px 0 5px 0;font-size:16px;">📦 ไอเท็มอื่น ๆ</h4>
            <label>พิมพ์ชื่อไอเท็ม (auto-complete):</label>
            <input id="customItemName" list="itemNameInputList" placeholder="เช่น Rare Candy หรือ Rare_Candy" style="width:100%;margin-bottom:5px;">
            <datalist id="itemNameInputList"></datalist>
            <label>จำนวน:</label>
            <input type="number" id="customItemAmount" value="1" min="1" style="width:100%;margin-bottom:5px;">
            <button id="addCustomItem" style="width:100%;">เพิ่มไอเท็ม</button>

            <div style="opacity:.7;margin-top:8px;font-size:12px;">
                กด <b>Insert</b> เพื่อแสดง/ซ่อนเครื่องมือนี้
            </div>
        `;

        container.innerHTML = html;
        document.body.appendChild(container);

        if (itemListReady) {
            const dl = document.getElementById('itemNameInputList');
            if (dl) {
                dl.innerHTML = '';
                const allKeys = Array.from(itemIndex.values()).sort();
                for (const k of allKeys) {
                    const opt = document.createElement('option');
                    opt.value = k.replace(/_/g, ' ');
                    dl.appendChild(opt);
                }
            }
        }

        document.getElementById("spawnPokemon").addEventListener("click", () => {
            const id = parseInt(document.getElementById("pokeId").value);
            const shiny = document.getElementById("pokeShiny").checked;
            if (id >= 1 && id <= 898) {
                App.game.party.gainPokemonById(id, shiny);
                notify(`✅ เสกโปเกมอน ID ${id} (${shiny ? '✨ Shiny' : 'ปกติ'})`);
            } else {
                notify(`❌ ID ต้องอยู่ระหว่าง 1-898`);
            }
        });

        document.getElementById("addCurrency").addEventListener("click", () => {
            const sel = document.getElementById("currencySelect");
            const idx = parseInt(sel.value) || 0;
            const c = currencies[idx];
            const amount = parseInt(document.getElementById("currencyAmount").value) || 0;
            if (amount > 0) {
                c.method(amount);
                notify(`✅ เพิ่ม ${c.name} +${amount}`);
            }
        });

        const customNameEl = document.getElementById("customItemName");
        const customAmtEl  = document.getElementById("customItemAmount");
        const addCustomBtn = document.getElementById("addCustomItem");

        function addCustom() {
            const itemName = (customNameEl.value || '').trim();
            const amount = parseInt(customAmtEl.value) || 1;
            if (!itemName) {
                notify("⚠️ ใส่ชื่อไอเท็มก่อนนะ");
                return;
            }
            gainItemByName(itemName, amount, "📦");
        }

        addCustomBtn.addEventListener("click", addCustom);
        customNameEl.addEventListener("keydown", (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
            }
        });
        customAmtEl.addEventListener("keydown", (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
            }
        });

        return container;
    }

    function gainItemByName(inputName, amount, icon = "🎁") {
        const key = resolveItemKey(inputName);
        if (key && ItemList[key] && typeof ItemList[key].gain === 'function') {
            ItemList[key].gain(amount);
            notify(`${icon} เพิ่ม ${key.replace(/_/g, ' ')} ×${amount}`);
        } else {
            notify(`⚠️ ไม่พบไอเท็ม: ${inputName}`);
        }
    }

    function removeUI() {
        const el = document.getElementById(CONTAINER_ID);
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    function toggleUI() {
        const exists = document.getElementById(CONTAINER_ID);
        if (exists) {
            removeUI();
        } else {
            if (!gameReady) {
                notify("⏳ กำลังโหลดเกม รอสักครู่แล้วกด Insert อีกครั้ง");
                return;
            }
            createUI();
        }
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

    waitForGameLoad(() => {
        notify(`✅ ${SCRIPT_NAME} v${VERSION} พร้อมใช้งาน — กด Insert เพื่อเปิด/ปิด`);
    });

    document.addEventListener('keydown', (e) => {
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea') return;

        if (e.key === 'Insert' || e.code === 'Insert' || e.keyCode === 45) {
            e.preventDefault();
            toggleUI();
        }
    });

})();
