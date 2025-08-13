(function () {
    'use strict';

    const currencies = [
        { name: "Pokédollars", method: amount => App.game.wallet.gainMoney(amount), current: () => App.game.wallet.money(), icon: "https://www.pokeclicker.com/assets/images/currency/money.svg" },
        { name: "Dungeon Tokens", method: amount => App.game.wallet.gainDungeonTokens(amount), current: () => App.game.wallet.dungeonTokens(), icon: "https://www.pokeclicker.com/assets/images/currency/dungeonToken.svg" },
        { name: "Quest Points", method: amount => App.game.wallet.gainQuestPoints(amount), current: () => App.game.wallet.questPoints(), icon: "https://www.pokeclicker.com/assets/images/currency/questPoint.svg" },
        { name: "Farm Points", method: amount => App.game.farming.gainFarmPoints(amount), current: () => App.game.farming.farmPoints, icon: "https://www.pokeclicker.com/assets/images/currency/farmPoint.svg" },
        { name: "Diamonds", method: amount => App.game.wallet.gainDiamonds(amount), current: () => App.game.wallet.diamonds(), icon: "https://www.pokeclicker.com/assets/images/currency/diamond.svg" },
        { name: "Battle Points", method: amount => App.game.wallet.gainBattlePoints(amount), current: () => App.game.wallet.battlePoints(), icon: "https://www.pokeclicker.com/assets/images/currency/battlePoint.svg" },
        { name: "Contest Tokens", method: amount => App.game.wallet.gainContestTokens(amount), current: () => App.game.wallet.contestTokens(), icon: "https://www.pokeclicker.com/assets/images/currency/contestToken.svg" },
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

    function waitForGameLoad(callback) {
        const checkInterval = setInterval(() => {
            if (
                typeof App !== 'undefined' &&
                App.game &&
                typeof App.game.party?.gainPokemonById === 'function' &&
                App.game.wallet &&
                typeof ItemList !== 'undefined'
            ) {
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
        container.style.width = "260px";
        container.style.maxHeight = "90vh";
        container.style.overflowY = "auto";

        let html = `
            <h4 style="margin:0 0 5px 0; font-size:16px;">🐉 Pokemon Spawner</h4>
            <label>ID (0-898):</label>
            <input type="number" id="pokeId" value="140" min="0" max="898" style="width:100%; margin-bottom:5px;">
            <label><input type="checkbox" id="pokeShiny"> Shiny</label><br>
            <button id="spawnPokemon" style="width:100%; margin-top:5px; margin-bottom:10px;">เสกโปเกมอน</button>
        `;

        let currencyOptions = currencies.map((c, i) => `
            <div class="currency-option" data-index="${i}" style="display:flex;align-items:center;padding:5px;cursor:pointer;">
                <img src="${c.icon}" style="width:20px;height:20px;margin-right:8px;">
                <span>${c.name}</span>
            </div>
        `).join('');

        html += `
            <h4 style="margin:10px 0 5px 0;font-size:16px;">💰 Currency Adder</h4>
            <div id="currencyList" style="border:1px solid #888;margin-bottom:5px;max-height:120px;overflow-y:auto;">
                ${currencyOptions}
            </div>
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
        `;

        container.innerHTML = html;
        document.body.appendChild(container);

        // เสกโปเกมอน
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

        // เลือกสกุลเงิน
        let selectedIndex = 0;
        document.querySelectorAll("#currencyList .currency-option").forEach(opt => {
            opt.addEventListener("click", function () {
                document.querySelectorAll("#currencyList .currency-option").forEach(o => o.style.background = "");
                this.style.background = "rgba(255,255,255,0.2)";
                selectedIndex = parseInt(this.dataset.index);
            });
        });

        // เพิ่มเงิน/แต้ม
        document.getElementById("addCurrency").addEventListener("click", () => {
            const c = currencies[selectedIndex];
            const amount = parseInt(document.getElementById("currencyAmount").value) || 0;
            if (amount > 0) {
                c.method(amount);
                notify(`✅ เพิ่ม ${c.name} +${amount} (ตอนนี้: ${c.current()})`);
            }
        });

        // เพิ่ม Evolution Item
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
