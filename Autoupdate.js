(function () {
    'use strict';

    const SCRIPT_NAME = "Pokéclicker Helper";
    const VERSION = "1.4.8"; // เปลี่ยน AC_TICKS_PER_SEC จาก 20 เป็น 100

    const CONTAINER_ID = "poke-helper-container";
    let gameReady = false;

    // ---------- Auto Click (minimal) ----------
    const AC_TICKS_PER_SEC = 100;   // เรียก loop 100 ครั้ง/วินาที
    const AC_MULTIPLIER    = 5;    // คลิกครั้งละ 5 → เป้าหมาย = 100/s
    const AC_TARGET_RATE   = AC_TICKS_PER_SEC * AC_MULTIPLIER;

    let acOn = JSON.parse(localStorage.getItem('acOn') || 'false');
    let acLoop = null;
    let acStatsLoop = null;
    let lastClicksCount = 0;

    function startAutoClick() {
        stopAutoClick(); // กันซ้ำ
        // loop ยิงคลิก
        acLoop = setInterval(() => {
            if (!acOn) return;
            const state = App.game.gameState;
            // ยิงคลิกตามสถานะต่อสู้ปัจจุบัน
            if (state === GameConstants.GameState.fighting) {
                for (let i = 0; i < AC_MULTIPLIER; i++) Battle.clickAttack();
            } else if (state === GameConstants.GameState.gym) {
                for (let i = 0; i < AC_MULTIPLIER; i++) GymBattle.clickAttack();
            } else if (state === GameConstants.GameState.dungeon && DungeonRunner.fighting()) {
                for (let i = 0; i < AC_MULTIPLIER; i++) DungeonBattle.clickAttack();
            } else if (state === GameConstants.GameState.temporaryBattle) {
                for (let i = 0; i < AC_MULTIPLIER; i++) TemporaryBattleBattle.clickAttack();
            }
        }, Math.ceil(1000 / AC_TICKS_PER_SEC));

        // loop คำนวณคลิกจริง/วินาที
        lastClicksCount = App.game.statistics.clickAttacks();
        acStatsLoop = setInterval(() => {
            const nowClicks = App.game.statistics.clickAttacks();
            const diff = nowClicks - lastClicksCount;
            lastClicksCount = nowClicks;
            const el = document.getElementById('acActual');
            if (el) el.textContent = diff.toLocaleString('en-US', { maximumFractionDigits: 1 });
        }, 1000);
    }

    function stopAutoClick() {
        if (acLoop) clearInterval(acLoop), acLoop = null;
        if (acStatsLoop) clearInterval(acStatsLoop), acStatsLoop = null;
    }

    function setAutoClick(on) {
        acOn = !!on;
        localStorage.setItem('acOn', JSON.stringify(acOn));
        if (acOn) startAutoClick(); else stopAutoClick();
        const box = document.getElementById('acToggle');
        if (box) box.checked = acOn;
    }

    // ---------- รายการเงิน/แต้ม ----------
    const currencies = [
        { name: "Pokédollars", method: amount => App.game.wallet.gainMoney(amount) },
        { name: "Dungeon Tokens", method: amount => App.game.wallet.gainDungeonTokens(amount) },
        { name: "Quest Points", method: amount => App.game.wallet.gainQuestPoints(amount) },
        { name: "Farm Points", method: amount => App.game.wallet.gainFarmPoints(amount) },
        { name: "Diamonds", method: amount => App.game.wallet.gainDiamonds(amount) },
        { name: "Battle Points", method: amount => App.game.wallet.gainBattlePoints(amount) },
        { name: "Contest Tokens", method: amount => App.game.wallet.gainContestTokens(amount) },
    ];

    // ---------- โหลดเกม ----------
    function waitForGameLoad(onReady) {
        const t = setInterval(() => {
            if (
                typeof App !== 'undefined' &&
                App.game &&
                typeof App.game.party?.gainPokemonById === 'function' &&
                App.game.wallet &&
                App.game.pokeballs &&
                typeof ItemList !== 'undefined'
            ) {
                clearInterval(t);
                gameReady = true;
                onReady?.();
            }
        }, 500);
    }

    // ---------- ค้นหาชื่อไอเท็ม ----------
    let itemIndex = new Map();
    let itemListReady = false;

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

    // ---------- UI ----------
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
            width: "300px",
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

            <h4 style="margin:10px 0 5px 0;font-size:16px;">💰 Currency Adder</h4>
            <label>เลือกสกุลเงิน:</label>
            <select id="currencySelect" style="width:100%;margin-bottom:5px;">
                ${currencies.map((c, i) => `<option value="${i}">${c.name}</option>`).join('')}
            </select>
            <label>จำนวน:</label>
            <input type="number" id="currencyAmount" value="1000" min="1" style="width:100%;margin-bottom:5px;">
            <button id="addCurrency" style="width:100%;">เพิ่ม</button>

            <h4 style="margin:10px 0 5px 0;font-size:16px;">⚙️ Auto Click</h4>
            <label style="display:inline-flex;align-items:center;gap:6px;margin-bottom:6px;">
                <input type="checkbox" id="acToggle"> เปิดใช้งาน Auto Click
            </label>
            <div style="opacity:.9;margin-bottom:2px;">Click Attack Rate (target): <b>${AC_TARGET_RATE}/s</b></div>
            <div>Clicks/s (actual): <b id="acActual">-</b></div>

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

        // เติม datalist
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

        // Spawner
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

        // Currency
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

        // Custom item
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
        customNameEl.addEventListener("keydown", (e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } });
        customAmtEl.addEventListener("keydown", (e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } });

        // Auto Click toggle
        const acToggle = document.getElementById('acToggle');
        acToggle.checked = acOn;
        acToggle.addEventListener('change', () => setAutoClick(acToggle.checked));

        // ถ้า UI เปิดหลังเกมพร้อมและเคยเปิดไว้ → เดินเครื่องเลย
        if (acOn) setAutoClick(true);

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

    // ---------- Boot ----------
    waitForGameLoad(() => {
        buildItemIndex();

        // แจ้งเตือนพร้อมใช้งาน
        notify(`✅ ${SCRIPT_NAME} v${VERSION} พร้อมใช้งาน — กด Insert เพื่อเปิด/ปิด`);

        // ทวีคเดิมของคุณ
        App.game.pokeballs.pokeballs.forEach(ball => {
            ball.catchTime = 10;
            console.log(`⚡ Pokéball: ${ball.name || ball.type} → catchTime = ${ball.catchTime}ms`);
        });          // ลดเวลาการจับ
        App.game.oakItems.itemList[0].bonusList = [100, 100, 100, 100, 100, 100];   // เปอร์เซนการจับ
        App.game.oakItems.itemList[0].inactiveBonus = 100;
        App.game.multiplier.addBonus('shiny',   () => 100); // อัตรา shiny
        App.game.multiplier.addBonus('roaming', () => 100); // ตัวหายาก
        App.game.multiplier.addBonus('exp',     () => 100); // EXP
        App.game.multiplier.addBonus('eggStep', () => 100); // ฟักไข่
        [4, 8, 9].forEach(i => { App.game.oakItems.itemList[i].bonusList = [100,100,100,100,100,100]; App.game.oakItems.itemList[i].inactiveBonus = 100; });
        [7,10,11].forEach(i => { App.game.oakItems.itemList[i].bonusList = [999999,999999,999999,999999,999999,999999]; App.game.oakItems.itemList[i].inactiveBonus = 999999; });

        // ถ้าไม่ได้เปิด UI แต่ต้องการให้ Auto Click ทำงานต่อเนื่องตามสถานะเดิม:
        if (acOn) setAutoClick(true);
    });

    // Hotkey แค่เปิด/ปิด UI (ตามเดิม)
    document.addEventListener('keydown', (e) => {
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea') return;
        if (e.key === 'Insert' || e.code === 'Insert' || e.keyCode === 45) {
            e.preventDefault();
            toggleUI();
        }
    });

})();
