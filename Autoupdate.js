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

    function waitForGameLoad(callback) {
        const checkInterval = setInterval(() => {
            if (typeof App !== 'undefined' && App.game && App.game.party?.gainPokemonById && App.game.wallet) {
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

        let currencyOptions = currencies.map((c, i) => `
            <div class="currency-option" data-index="${i}" style="display:flex;align-items:center;padding:5px;cursor:pointer;">
                <img src="${c.icon}" style="width:20px;height:20px;margin-right:8px;">
                <span>${c.name}</span>
            </div>
        `).join('');

        container.innerHTML = `
            <h4 style="margin:0 0 5px 0; font-size:16px;">🐉 Pokemon Spawner</h4>
            <label>ID (0-898):</label>
            <input type="number" id="pokeId" value="140" min="0" max="898" style="width:100%; margin-bottom:5px;">
            <label><input type="checkbox" id="pokeShiny"> Shiny</label><br>
            <button id="spawnPokemon" style="width:100%; margin-top:5px; margin-bottom:10px;">เสกโปเกมอน</button>

            <h4 style="margin:10px 0 5px 0;font-size:16px;">💰 Currency Adder</h4>
            <div id="currencyList" style="border:1px solid #888;margin-bottom:5px;max-height:120px;overflow-y:auto;">
                ${currencyOptions}
            </div>
            <label>จำนวน:</label>
            <input type="number" id="currencyAmount" value="1000" min="1" style="width:100%;margin-bottom:5px;">
            <button id="addCurrency" style="width:100%;">เพิ่ม</button>
        `;

        document.body.appendChild(container);

        // Pokemon Spawner click
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

        // Currency Adder click
        let selectedIndex = 0;
        document.querySelectorAll("#currencyList .currency-option").forEach(opt => {
            opt.addEventListener("click", function () {
                document.querySelectorAll("#currencyList .currency-option").forEach(o => o.style.background = "");
                this.style.background = "rgba(255,255,255,0.2)";
                selectedIndex = parseInt(this.dataset.index);
            });
        });

        document.getElementById("addCurrency").addEventListener("click", () => {
            const c = currencies[selectedIndex];
            const amount = parseInt(document.getElementById("currencyAmount").value) || 0;
            if (amount > 0) {
                c.method(amount);
                notify(`✅ เพิ่ม ${c.name} +${amount} (ตอนนี้: ${c.current()})`);
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
