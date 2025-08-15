(function () {
    'use strict';

    const SCRIPT_NAME = "Pokéclicker Helper";
    const VERSION = "1.7.8";

    // ⛔ ตั้งให้ไม่เปิด UI อัตโนมัติ
    const AUTO_OPEN_UI = false;

    const CONTAINER_ID = "poke-helper-container";
    let gameReady = false;

    // ---------- Auto Click / Fast Attack ----------
    const AC_TICKS_PER_SEC = 100;
    const AC_MULTIPLIER    = 5;

    // เปิดอัตโนมัติเป็นค่าเริ่มต้น
    let acOn = JSON.parse(localStorage.getItem('acOn') ?? 'true');
    let acLoop = null;

    function startAutoClick() {
        stopAutoClick();
        acLoop = setInterval(() => {
            if (!acOn) return;
            const state = App.game.gameState;
            if (state === GameConstants.GameState.fighting) {
                for (let i = 0; i < AC_MULTIPLIER; i++) Battle.clickAttack();
            } else if (state === GameConstants.GameState.gym) {
                for (let i = 0; i < AC_MULTIPLIER; i++) GymBattle.clickAttack();
            } else if (state === GameConstants.GameState.dungeon && DungeonRunner.fighting?.()) {
                for (let i = 0; i < AC_MULTIPLIER; i++) DungeonBattle.clickAttack();
            } else if (state === GameConstants.GameState.temporaryBattle) {
                for (let i = 0; i < AC_MULTIPLIER; i++) TemporaryBattleBattle.clickAttack();
            } else if (state === GameConstants.GameState.battleFrontier) {
                for (let i = 0; i < AC_MULTIPLIER; i++) BattleFrontierBattle.clickAttack();
            }
        }, Math.ceil(1000 / AC_TICKS_PER_SEC));
    }
    function stopAutoClick() { if (acLoop) clearInterval(acLoop), acLoop = null; }
    function setAutoClick(on) {
        acOn = !!on;
        localStorage.setItem('acOn', JSON.stringify(acOn));
        if (acOn) startAutoClick(); else stopAutoClick();
        const box = document.getElementById('acToggle');
        if (box) box.checked = acOn;
    }

    const PA_INTERVAL_MS = 10;
    let paOn   = JSON.parse(localStorage.getItem('paOn') || 'true');
    let paLoop = null;

    function startFastPokemonAttack() {
        stopFastPokemonAttack();
        paLoop = setInterval(() => {
            if (!paOn) return;
            const state = App.game.gameState;
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
                const enemy = BattleFrontierBattle?.enemyPokemon?.();
                if (BattleFrontierRunner?.started?.() && enemy?.isAlive?.()) BattleFrontierBattle.pokemonAttack();
            }
        }, PA_INTERVAL_MS);
    }
    function stopFastPokemonAttack() { if (paLoop) clearInterval(paLoop), paLoop = null; }
    function setFastPokemonAttack(on) {
        paOn = !!on;
        localStorage.setItem('paOn', JSON.stringify(paOn));
        if (paOn) startFastPokemonAttack(); else stopFastPokemonAttack();
        const box = document.getElementById('paToggle');
        if (box) box.checked = paOn;
    }

    // 🔸 Auto-start kicker
    function autoStartFeatures(retryMs = 800, tries = 6) {
        const kick = () => {
            try { setAutoClick(true); } catch {}
            try { setFastPokemonAttack(true); } catch {}
        };
        kick();
        let left = Math.max(0, tries - 1);
        const timer = setInterval(() => {
            kick();
            if (--left <= 0) clearInterval(timer);
        }, retryMs);
    }

    window.addEventListener('focus', () => autoStartFeatures(800, 3));
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') autoStartFeatures(800, 3);
    });

    // ---------- Oak Items Unlimited (existing patch) ----------
    (function () {
        const LOG_PREFIX = '[OakFix]';
        const desiredMode = 'ALL';

        function runOakFix() {
            const O = App?.game?.oakItems;
            if (!O) return false;

            const total = Array.isArray(O.itemList) ? O.itemList.length : (O.itemList?.length ?? 0);
            if (!total) return false;

            try {
                for (let i = 0; i < total; i++) O.unlockRequirements[i] = 0;
            } catch (e) { console.warn(LOG_PREFIX, 'unlockRequirements error', e); }

            const want = (desiredMode === 'ALL') ? total : Math.max(1, Math.min(Number(desiredMode) || total, total));

            const readMax = () => {
                try {
                    if (ko?.isObservable?.(O.maxActiveCount)) return O.maxActiveCount();
                    if (typeof O.maxActiveCount === 'function') return O.maxActiveCount();
                    if (typeof O.maxActiveCount === 'number') return O.maxActiveCount;
                } catch {}
                return null;
            };

            let wrote = false;
            try {
                if (ko?.isObservable?.(O.maxActiveCount)) { O.maxActiveCount(want); wrote = true; }
                else if (typeof O.maxActiveCount === 'function') { try { O.maxActiveCount(want); wrote = true; } catch {} }
                else if (typeof O.maxActiveCount === 'number') { O.maxActiveCount = want; wrote = true; }
            } catch (e) {}

            if (!wrote) {
                try {
                    if (typeof O.maxActiveCount === 'function') {
                        let _val = want;
                        O.maxActiveCount = function(v){
                            if (typeof v === 'number') _val = v;
                            return _val;
                        };
                        wrote = true;
                    } else {
                        Object.defineProperty(O, 'maxActiveCount', {
                            configurable: true,
                            get(){ return want; },
                            set(v){},
                        });
                        wrote = true;
                    }
                } catch (e) {
                    console.warn(LOG_PREFIX, 'patch maxActiveCount failed', e);
                }
            }

            try {
                for (let i = 0; i < total; i++) {
                    const ia = O.isActive?.[i];
                    const itemIA = O.itemList?.[i]?.isActive;
                    if (ko?.isObservable?.(ia)) ia(true);
                    else if (ko?.isObservable?.(itemIA)) itemIA(true);
                    else if (typeof O.toggleItem === 'function') {
                        const wasActive = (ia?.() ?? itemIA?.() ?? false);
                        if (!wasActive) O.toggleItem(i);
                    }
                }
            } catch (e) { console.warn(LOG_PREFIX, 'auto-activate fail', e); }

            try { O.update?.(); } catch {}
            try { O.calculateBonus?.(); } catch {}

            try {
                const modal = document.getElementById('oakItemsModal');
                if (modal) {
                    const h5 = modal.querySelector('h5');
                    const act = (typeof O.activeCount === 'function') ? O.activeCount() : (O.activeCount?.() ?? 0);
                    const mx = readMax() ?? want;
                    if (h5) h5.textContent = `Oak Items Equipped: ${act}/${mx}`;
                }
            } catch (e) {}

            return true;
        }

        const tryRun = () => {
            const ok = runOakFix();
            if (!ok) setTimeout(tryRun, 250);
        };

        try {
            const oldHide = Preload?.hideSplashScreen;
            if (typeof oldHide === 'function') {
                Preload.hideSplashScreen = function (...args) {
                    const r = oldHide.apply(this, args);
                    setTimeout(tryRun, 0);
                    // เตะระบบทันทีที่ปิด Splash
                    setTimeout(() => autoStartFeatures(800, 6), 0);
                    return r;
                };
            }
        } catch {}

        tryRun();
    })();

    // ---------- Currency helpers ----------
    const currencies = [
        { name: "Pokédollars",     method: amount => App.game.wallet.gainMoney(amount) },
        { name: "Dungeon Tokens",  method: amount => App.game.wallet.gainDungeonTokens(amount) },
        { name: "Quest Points",    method: amount => App.game.wallet.gainQuestPoints(amount) },
        { name: "Farm Points",     method: amount => App.game.wallet.gainFarmPoints(amount) },
        { name: "Diamonds",        method: amount => App.game.wallet.gainDiamonds(amount) },
        { name: "Battle Points",   method: amount => App.game.wallet.gainBattlePoints(amount) },
        { name: "Contest Tokens",  method: amount => App.game.wallet.gainContestTokens(amount) },
    ];

    // ---------- Wait for game ----------
    function waitForGameLoad(onReady) {
        const t = setInterval(() => {
            if (
                typeof App !== 'undefined' &&
                App.game &&
                typeof App.game.party?.gainPokemonById === 'function' &&
                App.game.wallet &&
                App.game.pokeballs &&
                typeof ItemList !== 'undefined' &&
                typeof PokemonHelper !== 'undefined' &&
                typeof PokemonHelper.getPokemonById === 'function'
            ) {
                clearInterval(t);
                gameReady = true;
                onReady?.();
            }
        }, 500);
    }

    // ---------- Item index ----------
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

    // ---------- Pokémon name index (forms-aware) ----------
    const POKE_MAX_BASE_ID = 898;
    const POKE_MAX_FORMS   = 99;

    // name -> { idDisplay: string, spawnId: number, name: string }
    let pokemonNameIndex = new Map();

    function pushNameEntry(idDisplay, spawnId, name) {
        if (!name) return;
        if (!pokemonNameIndex.has(name)) {
            pokemonNameIndex.set(name, { idDisplay, spawnId, name });
        }
    }

    function buildPokemonNameIndex() {
        pokemonNameIndex.clear();

        // base ids
        for (let base = 1; base <= POKE_MAX_BASE_ID; base++) {
            const p = PokemonHelper.getPokemonById(base);
            if (p?.name) pushNameEntry(String(base), base, p.name);
        }

        // forms .01 - .99
        for (let base = 1; base <= POKE_MAX_BASE_ID; base++) {
            for (let f = 1; f <= POKE_MAX_FORMS; f++) {
                const formTwo = String(f).padStart(2, '0');
                const idStr   = `${base}.${formTwo}`;      // "229.01"
                let name = null;
                let spawnIdNum = null;

                if (typeof pokemonMap !== 'undefined' && pokemonMap?.[idStr]?.name) {
                    name = pokemonMap[idStr].name;
                }

                if (!name) {
                    const idNum = Number((base + f/100).toFixed(2));
                    const pf = PokemonHelper.getPokemonById(idNum);
                    if (pf?.name) { name = pf.name; spawnIdNum = idNum; }
                }

                if (name && spawnIdNum == null) spawnIdNum = Number(idStr);
                if (name && spawnIdNum != null) pushNameEntry(idStr, spawnIdNum, name);
            }
        }
    }

    function populatePokemonDatalist() {
        const dl = document.getElementById('pokemonNameList');
        if (!dl) return;
        dl.innerHTML = '';
        const names = Array.from(pokemonNameIndex.keys()).sort((a,b)=>a.localeCompare(b));
        for (const n of names) {
            const opt = document.createElement('option');
            opt.value = n;
            dl.appendChild(opt);
        }
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

            <label>เลือกโปเกมอน (Auto-complete):</label>
            <input id="pokeName" list="pokemonNameList" placeholder="เช่น Houndoom (Mega)" style="width:100%; margin-bottom:5px;">
            <datalist id="pokemonNameList"></datalist>
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

            <h4 style="margin:10px 0 5px 0;font-size:16px;">⚡ Fast Pokémon Attack</h4>
            <label style="display:inline-flex;align-items:center;gap:6px;margin-bottom:6px;">
                <input type="checkbox" id="paToggle"> เปิดใช้งาน Fast Pokémon Attack
            </label>
            <div style="opacity:.8;">Interval: <b>${PA_INTERVAL_MS} ms</b></div>

            <h4 style="margin:10px 0 5px 0;font-size:16px;">📦 ไอเท็มอื่น ๆ</h4>
            <label>พิมพ์ชื่อไอเท็ม:</label>
            <input id="customItemName" list="itemNameInputList" placeholder="เช่น Rare Candy" style="width:100%;margin-bottom:5px;">
            <datalist id="itemNameInputList"></datalist>
            <label>จำนวน:</label>
            <input type="number" id="customItemAmount" value="1" min="1" style="width:100%;margin-bottom:5px;">
            <button id="addCustomItem" style="width:100%;">เพิ่มไอเท็ม</button>

            <div style="opacity:.7;margin-top:8px;font-size:12px;">
                กด <b>Ctrl + Insert</b> เพื่อแสดง/ซ่อนเครื่องมือนี้
            </div>
        `;

        container.innerHTML = html;
        document.body.appendChild(container);

        // เติมรายการไอเท็ม
        if (itemListReady) {
            const dl = document.getElementById('itemNameInputList');
            dl.innerHTML = '';
            const allKeys = Array.from(itemIndex.values()).sort();
            for (const k of allKeys) {
                const opt = document.createElement('option');
                opt.value = k.replace(/_/g, ' ');
                dl.appendChild(opt);
            }
        }

        // เติมรายชื่อโปเกมอน
        populatePokemonDatalist();

        // Handlers
        document.getElementById("spawnPokemon").addEventListener("click", () => {
            const nameInput = String(document.getElementById("pokeName").value || '').trim();
            const shiny = document.getElementById("pokeShiny").checked;

            if (!nameInput) {
                notify('⚠️ กรุณาพิมพ์ชื่อโปเกมอน (เช่น "Houndoom (Mega)")');
                return;
            }

            let entry = pokemonNameIndex.get(nameInput);

            if (!entry) {
                const lower = nameInput.toLowerCase();
                for (const [k, v] of pokemonNameIndex.entries()) {
                    if (k.toLowerCase() === lower) { entry = v; break; }
                }
                if (!entry) {
                    for (const [k, v] of pokemonNameIndex.entries()) {
                        if (k.toLowerCase().startsWith(lower)) { entry = v; break; }
                    }
                }
            }

            if (!entry) {
                notify(`❌ ไม่พบโปเกมอนชื่อ: ${nameInput}`);
                return;
            }

            const { spawnId, name } = entry;

            if (typeof App?.game?.party?.gainPokemonByName === 'function') {
                App.game.party.gainPokemonByName(name, shiny);
                notify(`✅ เสกโปเกมอน: ${name} ${shiny ? '✨ Shiny' : 'ปกติ'}`);
                return;
            }

            App.game.party.gainPokemonById(spawnId, shiny);
            notify(`✅ เสกโปเกมอน: ${name} (ID: ${spawnId}) ${shiny ? '✨ Shiny' : 'ปกติ'}`);
        });

        document.getElementById("addCurrency").addEventListener("click", () => {
            const idx = parseInt(document.getElementById("currencySelect").value) || 0;
            const c = currencies[idx];
            const amount = parseInt(document.getElementById("currencyAmount").value) || 0;
            if (amount > 0) {
                c.method(amount);
                notify(`✅ เพิ่ม ${c.name} +${amount}`);
            }
        });

        const addCustom = () => {
            const itemName = (document.getElementById("customItemName").value || '').trim();
            const amount = parseInt(document.getElementById("customItemAmount").value) || 1;
            if (!itemName) return notify("⚠️ ใส่ชื่อไอเท็มก่อน");
            gainItemByName(itemName, amount, "📦");
        };
        document.getElementById("addCustomItem").addEventListener("click", addCustom);

        const acToggle = document.getElementById('acToggle');
        acToggle.checked = acOn;
        acToggle.addEventListener('change', () => setAutoClick(acToggle.checked));

        const paToggle = document.getElementById('paToggle');
        paToggle.checked = paOn;
        paToggle.addEventListener('change', () => setFastPokemonAttack(paToggle.checked));

        if (acOn) setAutoClick(true);
        if (paOn) setFastPokemonAttack(true);

        return container;
    }

    function removeUI() {
        const el = document.getElementById(CONTAINER_ID);
        if (el) el.remove();
    }

    function toggleUI() {
        const exists = document.getElementById(CONTAINER_ID);
        if (exists) removeUI();
        else if (gameReady) createUI();
        else notify("⏳ กำลังโหลดเกม รอสักครู่แล้วกด Ctrl + Insert อีกครั้ง");
    }

    function gainItemByName(inputName, amount, icon = "🎁") {
        const key = resolveItemKey(inputName);
        if (key && ItemList[key]?.gain) {
            ItemList[key].gain(amount);
            notify(`${icon} เพิ่ม ${key.replace(/_/g, ' ')} ×${amount}`);
        } else {
            notify(`⚠️ ไม่พบไอเท็ม: ${inputName}`);
        }
    }

    function notify(msg) {
        if (typeof Notifier !== 'undefined') {
            try {
                Notifier.notify({ message: msg, type: NotificationConstants.NotificationOption.success });
            } catch {
                console.log(msg);
            }
        } else {
            console.log(msg);
        }
    }

    // ---------- Boot ----------
    waitForGameLoad(() => {
        buildItemIndex();
        notify(`✅ ${SCRIPT_NAME} v${VERSION} Ready !!`);

        // เตรียมชื่อโปเกมอน (ไม่ต้องมี UI ก็ทำงานได้)
        buildPokemonNameIndex();

        // เริ่มทำงานเลย และย้ำช่วงแรก
        autoStartFeatures(800, 6);

        // Oak items to max level
        try {
            App.game.oakItems.itemList.forEach(item => {
                if (typeof item.level === 'function') item.level(item.maxLevel);
                else item.level = item.maxLevel;
            });
            App.game.oakItems.update();
            App.game.oakItems.calculateBonus();
        } catch {}

        // tweaks อื่น ๆ
        try {
            App.game.pokeballs.pokeballs.forEach(ball => { ball.catchTime = 10; });
            App.game.oakItems.itemList[0].bonusList = [100, 100, 100, 100, 100, 100];
            App.game.oakItems.itemList[0].inactiveBonus = 100;
            App.game.multiplier.addBonus('shiny',   () => 10);
            App.game.multiplier.addBonus('roaming', () => 100);
            App.game.multiplier.addBonus('exp',     () => 100);
            App.game.multiplier.addBonus('eggStep', () => 100);
            [4, 8, 9].forEach(i => {
                App.game.oakItems.itemList[i].bonusList = [100,100,100,100,100,100];
                App.game.oakItems.itemList[i].inactiveBonus = 100;
            });
            [7,10,11].forEach(i => {
                App.game.oakItems.itemList[i].bonusList = [999999,999999,999999,999999,999999,999999];
                App.game.oakItems.itemList[i].inactiveBonus = 999999;
            });
            BerryMutations.mutationChance = 100;
        } catch {}

        if (typeof BattleFrontierBattle !== 'undefined') {
            BattleFrontierBattle._origPokemonAttack = BattleFrontierBattle.pokemonAttack;
            BattleFrontierBattle.pokemonAttack = function () {
                const enemy = this.enemyPokemon?.();
                if (!enemy?.isAlive()) return;
                const weather = (typeof WeatherType !== 'undefined') ? WeatherType.Clear : 0;
                enemy.damage(App.game.party.calculatePokemonAttack(
                    enemy.type1, enemy.type2, true, GameConstants.Region.none, false, false, weather
                ));
                if (!enemy.isAlive()) this.defeatPokemon();
            };
        }

        // ลบ MissingNo. เผื่อมี
        try { App.game.party.removePokemonByName?.("MissingNo."); } catch {}

        // ❌ ไม่เรียก createUI(); อีกต่อไป
        // ถ้าต้องการเปิด UI กด Ctrl+Insert เพื่อ toggleUI()
        if (AUTO_OPEN_UI) {
            // เผื่ออยากเปิดอัตโนมัติในอนาคต
            try { createUI(); } catch {}
        }
    });

    // ---------- Hotkey ----------
    document.addEventListener('keydown', (e) => {
        const tag = e.target?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        if (e.code === 'Insert' && e.ctrlKey) {
            e.preventDefault();
            toggleUI();
        }
    });
})();
