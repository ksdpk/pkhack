(function () {
    'use strict';

    const CONTAINER_ID = "poke-helper-container";
    let gameReady = false;

    const currencies = [
        { name: "Pokédollars", method: amount => App.game.wallet.gainMoney(amount) },
        { name: "Dungeon Tokens", method: amount => App.game.wallet.gainDungeonTokens(amount) },
        { name: "Quest Points", method: amount => App.game.wallet.gainQuestPoints(amount) },
        { name: "Farm Points", method: amount => App.game.wallet.gainFarmPoints(amount) },
        { name: "Diamonds", method: amount => App.game.wallet.gainDiamonds(amount) },
        { name: "Battle Points", method: amount => App.game.wallet.gainBattlePoints(amount) },
        { name: "Contest Tokens", method: amount => App.game.wallet.gainContestTokens(amount) },
    ];

    const evoItems = [
        "Auspicious_armor", "Black_augurite", "Black_DNA", "Black_mane_hair",
        "Cracked_pot", "Crystallized_shadow", "Dawn_stone", "Deep_sea_scale",
        "Deep_sea_tooth", "Dragon_scale", "Dubious_disc", "Dusk_stone",
        "Electirizer", "Fire_stone", "Galarica_cuff", "Galarica_wreath",
        "Gimmighoul_coin", "Ice_stone", "Key_stone", "Kings_rock",
        "Leaders_crest", "Leaf_stone", "Linking_cord", "Lunar_light",
        "Magmarizer", "Malicious_armor", "Metal_alloy", "Metal_coat",
        "Moon_stone", "Peat_block", "Prism_scale", "Protector",
        "Pure_light", "Razor_claw", "Razor_fang", "Reaper_cloth",
        "Sachet", "Shiny_stone", "Solar_light", "Soothe_bell",
        "Sun_stone", "Sweet_apple", "Syrupy_apple", "Tart_apple",
        "Thunder_stone", "Unremarkable_teacup", "Upgrade", "Water_stone",
        "Whipped_dream", "White_DNA", "White_mane_hair"
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
                onReady?.();
            }
        }, 500);
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
            width: "260px",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
            backdropFilter: "blur(2px)"
        });

        let html = `
            <h4 style="margin:0 0 5px 0; font-size:16px;">🐉 Pokemon Spawner</h4>
            <label>ID (1-898):</label>
            <input type="number" id="pokeId" value="1" min="1" max="898" style="width:100%; margin-bottom:5px;">
            <label style="display:inline-flex;align-items:center;gap:6px;"><input type="checkbox" id="pokeShiny"> Shiny</label><br>
            <button id="spawnPokemon" style="width:100%; margin-top:5px; margin-bottom:10px;">เสกโปเกมอน</button>
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
            <h4 style="margin:10px 0 5px 0;font-size:16px;">🪄 Evolution Items</h4>
            <label>เลือกไอเท็ม:</label>
            <select id="evoSelect" style="width:100%;margin-bottom:5px;">
                ${evoItems.map(i => `<option value="${i}">${i.replace(/_/g, ' ')}</option>`).join('')}
            </select>
            <label>จำนวน:</label>
            <input type="number" id="evoAmount" value="1" min="1" style="width:100%;margin-bottom:5px;">
            <button id="addEvoItem" style="width:100%;">เพิ่มไอเท็ม</button>
            <div style="opacity:.7;margin-top:8px;font-size:12px;">กด <b>Insert</b> เพื่อแสดง/ซ่อนเครื่องมือนี้</div>
        `;

        container.innerHTML = html;
        document.body.appendChild(container);

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
            const sel = /** @type {HTMLSelectElement} */(document.getElementById("currencySelect"));
            const idx = parseInt(sel.value) || 0;
            const c = currencies[idx];
            const amount = parseInt(document.getElementById("currencyAmount").value) || 0;
            if (amount > 0) {
                c.method(amount);
                notify(`✅ เพิ่ม ${c.name} +${amount}`);
            }
        });

        document.getElementById("addEvoItem").addEventListener("click", () => {
            const itemName = document.getElementById("evoSelect").value;
            const amount = parseInt(document.getElementById("evoAmount").value) || 1;
            if (ItemList[itemName] && typeof ItemList[itemName].gain === 'function') {
                ItemList[itemName].gain(amount);
                notify(`🪄 เพิ่ม ${itemName.replace(/_/g, ' ')} ×${amount}`);
            } else {
                notify(`⚠️ ไม่พบไอเท็ม: ${itemName}`);
            }
        });

        return container;
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

    waitForGameLoad();

    document.addEventListener('keydown', (e) => {
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea') return;

        if (e.key === 'Insert' || e.code === 'Insert' || e.keyCode === 45) {
            e.preventDefault();
            toggleUI();
        }
    });

    // (ออปชัน) ถ้าอยากให้เปิดทันทีครั้งแรก ให้ uncomment บรรทัดด้านล่าง:
    // waitForGameLoad(() => createUI());

})();
