(function () {
    'use strict';

    const SCRIPT_NAME = "Pokéclicker Helper";
    const VERSION = "1.5.0"; // เพิ่ม เสกโปเกมอนด้วยจุดทศนิยม

    const CONTAINER_ID = "poke-helper-container";
    let gameReady = false;

    // ---------- Auto Click (minimal) ----------
    const AC_TICKS_PER_SEC = 100;   // เรียก loop 100 ครั้ง/วินาที
    const AC_MULTIPLIER    = 5;     // คลิกครั้งละ 5 → เป้าหมาย = 100/s
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
            } else if (state === GameConstants.GameState.dungeon && DungeonRunner.fighting?.()) {
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

    // ---------- Fast Pokémon Attack (ไม่แก้ constant) ----------
    // ยิง pokemonAttack() เองถี่ ๆ ตามโหมดการสู้ เพื่อลด "ระยะเวลาโจมตีอัตโนมัติ"
    const PA_INTERVAL_MS = 10; // 10ms ≈ 100 ครั้ง/วินาที (ระวัง CPU)
    let paOn   = JSON.parse(localStorage.getItem('paOn') || 'false'); // ปิดค่าเริ่มต้น
    let paLoop = null;

    function startFastPokemonAttack() {
        stopFastPokemonAttack();
        paLoop = setInterval(() => {
            if (!paOn) return;
            const state = App.game.gameState;

            // ตรวจว่าในแต่ละโหมด "กำลังสู้" อยู่ และมีศัตรู
            if (state === GameConstants.GameState.fighting) {
                const enemy = Battle.enemyPokemon?.();
                if (enemy?.isAlive?.()) Battle.pokemonAttack();
            } else if (state === GameConstants.GameState.gym) {
                const enemy = GymBattle.enemyPokemon?.();
                if (GymRunner?.running?.() && enemy?.isAlive?.()) GymBattle.pokemonAttack();
            } else if (state === GameConstants.GameState.dungeon) {
                const enemy = DungeonBattle.enemyPokemon?.();
                if (DungeonRunner?.fighting?.() && enemy?.isAlive?.()) DungeonBattle.pokemonAttack();
            } else if (state === GameConstants.GameState.temporaryBattle) {
                const enemy = TemporaryBattleBattle.enemyPokemon?.();
                if (TemporaryBattleRunner?.running?.() && enemy?.isAlive?.()) TemporaryBattleBattle.pokemonAttack();
            } else if (state === GameConstants.GameState.battleFrontier) {
                // จะเร็วจริงต้องใช้แพตช์ปลดลิมิต 450ms ข้างล่าง
                const enemy = BattleFrontierBattle?.enemyPokemon?.();
                if (BattleFrontierRunner?.started?.() && enemy?.isAlive?.()) BattleFrontierBattle.pokemonAttack();
            }
        }, PA_INTERVAL_MS);
    }

    function stopFastPokemonAttack() {
        if (paLoop) clearInterval(paLoop), paLoop = null;
    }

    function setFastPokemonAttack(on) {
        paOn = !!on;
        localStorage.setItem('paOn', JSON.stringify(paOn));
        if (paOn) startFastPokemonAttack(); else stopFastPokemonAttack();
        const box = document.getElementById('paToggle');
        if (box) box.checked = paOn;
    }

    // ---------- รายการเงิน/แต้ม ----------
    const currencies = [
        { name: "Pokédollars",     method: amount => App.game.wallet.gainMoney(amount) },
        { name: "Dungeon Tokens",  method: amount => App.game.wallet.gainDungeonTokens(amount) },
        { name: "Quest Points",    method: amount => App.game.wallet.gainQuestPoints(amount) },
        { name: "Farm Points",     method: amount => App.game.wallet.gainFarmPoints(amount) },
        { name: "Diamonds",        method: amount => App.game.wallet.gainDiamonds(amount) },
        { name: "Battle Points",   method: amount => App.game.wallet.gainBattlePoints(amount) },
        { name: "Contest Tokens",  method: amount => App.game.wallet.gainContestTokens(amount) },
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

            <h4 style="margin:10px 0 5px 0;font-size:16px;">⚡ Fast Pokémon Attack</h4>
            <label style="display:inline-flex;align-items:center;gap:6px;margin-bottom:6px;">
                <input type="checkbox" id="paToggle"> เปิดใช้งาน Fast Pokémon Attack
            </label>
            <div style="opacity:.8;">Interval: <b>${PA_INTERVAL_MS} ms</b> (ยิ่งต่ำยิ่งเร็ว แต่กิน CPU)</div>

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
            const idInput = document.getElementById("pokeId").value;
            const id = parseFloat(idInput); // รองรับทศนิยม
            const shiny = document.getElementById("pokeShiny").checked;
        
            if (id >= 1 && id <= 898.99) {
                App.game.party.gainPokemonById(id, shiny);
                const name = PokemonHelper.getPokemonById(id)?.name || 'Unknown';
                notify(`✅ เสกโปเกมอน: ${name} (ID: ${id}) ${shiny ? '✨ Shiny' : 'ปกติ'}`);
            } else {
                notify(`❌ ID ต้องอยู่ระหว่าง 1 ถึง 898.x`);
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

        // Fast Pokémon Attack toggle
        const paToggle = document.getElementById('paToggle');
        paToggle.checked = paOn;
        paToggle.addEventListener('change', () => setFastPokemonAttack(paToggle.checked));

        // ถ้า UI เปิดหลังเกมพร้อมและเคยเปิดไว้ → เดินเครื่องเลย
        if (acOn) setAutoClick(true);
        if (paOn) setFastPokemonAttack(true);

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
        });
        App.game.oakItems.itemList[0].bonusList = [100, 100, 100, 100, 100, 100];
        App.game.oakItems.itemList[0].inactiveBonus = 100;
        App.game.multiplier.addBonus('shiny',   () => 10);
        App.game.multiplier.addBonus('roaming', () => 100);
        App.game.multiplier.addBonus('exp',     () => 100);
        App.game.multiplier.addBonus('eggStep', () => 100);
        [4, 8, 9].forEach(i => { App.game.oakItems.itemList[i].bonusList = [100,100,100,100,100,100]; App.game.oakItems.itemList[i].inactiveBonus = 100; });
        [7,10,11].forEach(i => { App.game.oakItems.itemList[i].bonusList = [999999,999999,999999,999999,999999,999999]; App.game.oakItems.itemList[i].inactiveBonus = 999999; });

        // ถ้าไม่ได้เปิด UI แต่ต้องการให้ Auto Click/PA ทำงานต่อเนื่องตามสถานะเดิม:
        if (acOn) setAutoClick(true);
        if (paOn) setFastPokemonAttack(true);

        // --- ปลดลิมิต 450ms ของ Battle Frontier เพื่อให้ Fast Pokémon Attack เร็วจริง ---
        if (typeof BattleFrontierBattle !== 'undefined') {
            BattleFrontierBattle._origPokemonAttack = BattleFrontierBattle.pokemonAttack;
            BattleFrontierBattle.pokemonAttack = function () {
                const enemy = this.enemyPokemon?.();
                if (!enemy?.isAlive()) return;
                const weather = (typeof WeatherType !== 'undefined') ? WeatherType.Clear : 0;
                enemy.damage(App.game.party.calculatePokemonAttack(enemy.type1, enemy.type2, true, GameConstants.Region.none, false, false, weather));
                if (!enemy.isAlive()) this.defeatPokemon();
            };
        }
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
