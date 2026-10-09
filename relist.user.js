// ==UserScript==
// @copyright           ©2014-2026, Damian Ho
// @description         Helper script for Backpack.tf
// @downloadURL         https://raw.githubusercontent.com/damianhxy/backpack.tf-enhancer/master/relist.user.js
// @exclude             https://backpack.tf/developer
// @exclude             https://backpack.tf/api/*
// @grant               GM_info
// @homepageURL         https://github.com/damianhxy/backpack.tf-enhancer
// @match               https://backpack.tf/*
// @name                Backpack.tf Enhancer
// @namespace           https://github.com/damianhxy
// @noframes
// @run-at              document-end
// @supportURL          https://github.com/damianhxy/backpack.tf-enhancer/issues
// @updateURL           https://raw.githubusercontent.com/damianhxy/backpack.tf-enhancer/master/relist.user.js
// @version             1.10.0
// ==/UserScript==

(function () {
    "use strict";
    /*********** SETTINGS ***********/
    const randomTime = 1,
        defaultTime = 5,
        randomMin = 3,
        randomMax = 10,
        updateFreq = 3,
        threshold = 5,
        absThreshold = 0.11;
    /******** END OF SETTINGS *******/

    /*********** CONSTANT ***********/
    const paintLookup = {
        "A Color Similar to Slate": 3100495,
        "A Deep Commitment to Purple": 8208497,
        "A Distinctive Lack of Hue": 1315860,
        "A Mann's Mint": 12377523,
        "After Eight": 2960676,
        "Aged Moustache Grey": 8289918,
        "An Air of Debonair": 6637376,
        "An Extraordinary Abundance of Tinge": 15132390,
        "Australium Gold": 15185211,
        "Balaclavas Are Forever": 3874595,
        "Color No. 216-190-216": 14204632,
        "Cream Spirit": 12807213,
        "Dark Salmon Injustice": 15308410,
        "Drably Olive": 8421376,
        "Indubitably Green": 7511618,
        "Mann Co. Orange": 13595446,
        "Muskelmannbraun": 10843461,
        "Noble Hatter's Violet": 5322826,
        "Operator's Overalls": 4732984,
        "Peculiarly Drab Tincture": 12955537,
        "Pink as Hell": 16738740,
        "Radigan Conagher Brown": 6901050,
        "Team Spirit": 12073019,
        "The Bitter Taste of Defeat and Lime": 3329330,
        "The Color of a Gentlemann's Business Pants": 15787660,
        "The Value of Teamwork": 8400928,
        "Waterlogged Lab Coat": 11049612,
        "Ye Olde Rustic Colour": 8154199,
        "Zepheniah's Greed": 4345659
    };

    const ksLookup = ["", "Killstreak ", "Specialized Killstreak ", "Professional Killstreak "];
    /******** END OF CONSTANT *******/

    let relistInterval = null;

    function addButton(prop, val, def) {
        sessionStorage.setItem(prop, sessionStorage.getItem(prop) || def);
        const button = document.createElement("a"),
            activated = JSON.parse(sessionStorage.getItem(prop)),
            curNum = document.querySelectorAll(".btn.btn-sm").length - 1;
        button.style = `width: 125px; position: fixed; top: ${45 + 32 * curNum}px; right: 2px;`;
        button.classList.add("btn", `btn-${activated ? "success" : "danger"}`, "btn-sm");
        button.addEventListener("click", () => {
            window.stop();
            sessionStorage.setItem(prop, !JSON.parse(sessionStorage.getItem(prop)));
            location.reload();
        });
        button.appendChild(createIcon(`toggle-${activated ? "on" : "off"}`, "border: none;"));
        button.appendChild(document.createTextNode(val));
        document.body.insertBefore(button, document.getElementById("helpers"));
    }

    function check(predicate, callback) {
        predicate() ? callback() : setTimeout(() => check(predicate, callback), 100);
    }

    function createIcon(cls, style) {
        const icon = document.createElement("i");
        icon.classList.add("fa", `fa-${cls}`, "fa-inverse", "fa-border", "pull-left");
        icon.style = `border-radius: 50%;${style ? " " + style : ""}`;
        return icon;
    }

    function displayText(msg, spinner) {
        if (!stat) return;
        if (msg) stat.textContent = msg;
        if (spinner !== undefined) {
            icon.classList.toggle("fa-info-circle", !spinner);
            icon.classList.toggle("fa-refresh", spinner);
            icon.classList.toggle("fa-spin", spinner);
        }
    }

    function getAttr(ele) {
        const attr = {};
        for (const e of ele.attributes) {
            attr[e.name] = isNaN(+e.value) ? e.value : +e.value;
        }
        return attr;
    }

    function label(ele, annotate, fastlist, change) {
        const frag = document.createDocumentFragment(),
            attr = getAttr(ele),
            title = attr["data-default_name"] || attr["title"];
        let craft = ele.querySelector(".tag.top-left");
        if (annotate || fastlist) {
            const killstreaker = ele.querySelector(".killstreaker");
            if (killstreaker) killstreaker.remove();
            const festivized = ele.querySelector(".festivized-item");
            if (festivized) festivized.remove();
            if (craft && !attr["data-crate"] && !attr["data-quantity"]) {
                if (+craft.textContent.slice(1) <= 100)
                    frag.appendChild(createIcon("exclamation-triangle"));
                craft.remove();
            }
            if (attr["data-gifted_name"]) {
                frag.appendChild(createIcon("gift"));
                const giftIcon = ele.querySelector(".fa-gift");
                if (giftIcon) giftIcon.remove();
            }
            const topLeft = ele.querySelector(".tag.top-left");
            if (topLeft) {
                topLeft.classList.add("top-right");
                topLeft.classList.remove("top-left");
            }
        }
        if (fastlist && ownProfile) {
            if (attr["data-defindex"] < 5000 || attr["data-defindex"] > 5002) {
                const isListed = attr["data-listing_price"];
                const priceTag = ele.querySelector(".fa.fa-tag");
                if (priceTag) priceTag.remove();
                const addLink = document.createElement("a");
                addLink.href = `https://backpack.tf/classifieds/sell/${attr["data-id"]}`;
                addLink.appendChild(createIcon(isListed ? "refresh" : "plus", "position: absolute; bottom: 0; left: 0; color: white;"));
                frag.appendChild(addLink);
                if (isListed) {
                    const removeLink = document.createElement("a");
                    removeLink.href = "#";
                    removeLink.appendChild(createIcon("times", "position: absolute; bottom: 0; left: 20px;"));
                    removeLink.addEventListener("click", e => {
                        e.preventDefault();
                        e.stopPropagation();
                        HTTPRequest("POST", "/classifieds/remove/440_" + attr["data-id"], () => {
                            const parent = e.target.parentElement;
                            const relistSlot = parent.previousElementSibling;
                            const relistIcon = relistSlot.firstElementChild;
                            if (relistIcon) relistIcon.remove();
                            relistSlot.appendChild(createIcon("plus", "position: absolute; bottom: 0; left: 0;"));
                            const changeEl = parent.nextElementSibling;
                            if (changeEl) changeEl.remove();
                            const price = parent.parentElement.nextElementSibling;
                            if (price) price.remove();
                            parent.remove();
                        }, `user-id=${window.Session.csrf}`);
                    });
                    frag.appendChild(removeLink);
                }
            }
        }
        if (change && attr["data-listing_price"]) {
            const valueEl = ele.querySelector(".value");
            if (valueEl && !attr["data-crate"])
                valueEl.style.display = "none";
            const curP = attr["data-price"],
                listP = parsePrice(attr["data-listing_price"]),
                diff = Math.abs(100 - (curP / listP) * 100),
                absDiff = Math.abs(curP - listP);
            if (!curP)
                frag.appendChild(createIcon("question", "color: blueviolet; background-color: white;"));
            else if (diff >= threshold && absDiff >= absThreshold) {
                let colour = "lime";
                if (diff >= threshold * 2 && diff <= threshold * 4)
                    colour = "goldenrod";
                else if (diff > threshold * 4)
                    colour = "crimson";
                frag.appendChild(createIcon(`level-${curP > listP ? "up" : "down"}`, `color: ${colour}; background-color: white;`));
            }
        }
        if (annotate) {
            if (attr["data-paint_name"] && attr["data-paint_name"] !== attr["data-name"])
                frag.appendChild(createIcon("paint-brush"));
            if (attr["data-part_name_1"])
                frag.appendChild(createIcon("cogs"));
            if (attr["data-spell_1"])
                frag.appendChild(createIcon("magic"));
            if (attr["data-festivized"])
                frag.appendChild(createIcon("lightbulb-o"));
            if (title.includes("Killstreak")) {
                let colour = "darkgoldenrod";
                if (title.includes("Specialized"))
                    colour = "darkgray";
                else if (title.includes("Professional"))
                    colour = "gold";
                frag.appendChild(createIcon("bomb", `color: ${colour}; background-color: white;`));
            }
            if (attr["data-custom_name"] || attr["data-custom_desc"])
                frag.appendChild(createIcon("file-text"));
        }
        const firstChild = ele.firstElementChild;
        if (firstChild) firstChild.appendChild(frag);
    }

    async function HTTPRequest(method, url, callback, data) {
        displayText("Sending", true);
        try {
            const response = await fetch(url, {
                method,
                headers: { "Content-type": "application/x-www-form-urlencoded" },
                body: data
            });
            if (!response.ok) {
                displayText(`Request Error: ${response.status}`, false);
                return;
            }
            const text = await response.text();
            displayText("Received", false);
            callback(text);
        } catch {
            displayText("Request Error", false);
        }
    }

    function parsePrice(str) {
        const arr = str.split(" ");
        let key = 0,
            ref = 0;
        if (arr[0].includes("–")) {
            const pts = arr[0].split("–");
            arr[0] = ((+pts[0] + +pts[1]) / 2).toString();
        }
        arr.forEach((e, i) => {
            if (e.includes("ref"))
                ref = +arr[i - 1];
            else if (e.includes("key"))
                key = +arr[i - 1];
        });
        if (key && !keyP) return NaN;
        return ref + key * keyP;
    }

    function range(lo, hi) {
        return Math.floor(Math.random() * (hi - lo + 1)) + lo;
    }

    function removeData() {
        localStorage.removeItem("threadRunning");
        ["mainThread", "curItem", "nextPage", "paused", "toList"].forEach(e => sessionStorage.removeItem(e));
    }

    function round(num) {
        if (num <= 5 / 90) return num;
        num += num * 10 % 1 / 90;
        return Math.floor(num) + Math.round((num % 1 * 9).toFixed(2)) / 9;
    }

    function showStatus(e, reloadTime) {
        if (reloadTime) {
            const min = Math.floor(reloadTime / 60),
                sec = reloadTime % 60;
            e.textContent = `Reloading classifieds in ${min}:${("0" + sec).slice(-2)}`;
            document.title = `Classifieds: ${min}:${("0" + sec).slice(-2)}`;
        } else {
            const doubleLeft = document.querySelector(".fa-angle-double-left");
            if (doubleLeft) doubleLeft.click();
            if (relistInterval) {
                clearInterval(relistInterval);
                relistInterval = null;
            }
        }
    }

    function update() {
        if (sessionStorage.getItem("mainThread"))
            return console.info(`Price updating suppressed`);
        if (!localStorage.getItem("apikey"))
            localStorage.setItem("apikey", prompt("API key not set, register yours from https://backpack.tf/developer/"));
        const apiKey = localStorage.getItem("apikey");
        if (!apiKey || apiKey.length !== 24) {
            if (apiKey) alert("Incorrect API key length");
            localStorage.removeItem("apikey");
            return;
        }
        displayText("Updating prices", true);
        HTTPRequest("GET", `https://backpack.tf/api/IGetPrices/v4/?key=${apiKey}`, e => {
            const data = JSON.parse(e);
            if (!data.response.success)
                return console.info(`Error:\n${data.response.message}`);
            const key = data.response.items["Mann Co. Supply Crate Key"].prices[6].Tradable.Craftable[0],
                r = Math.floor(data.response.raw_usd_value * 1000) / 10,
                k = (key.value + (key.value_high || key.value)) / 2,
                rDiff = `(${r === refP ? "=" : r < refP ? "↓" : "↑"})`,
                kDiff = `(${k === keyP ? "=" : k < keyP ? "↓" : "↑"})`;
            localStorage.setItem("refP", r);
            localStorage.setItem("keyP", k);
            console.info(`Prices updated, Refined: ${r} Cents ${rDiff}, Keys: ${k} Refined ${kDiff}`);
            localStorage.setItem("lastupdt", Date.now());
            displayText("Prices updated", false);
        });
    }

    function loadProfile() {
        addButton("annotate", "Annotate", false);
        addButton("pricediff", "Show Change", false);
        if (ownProfile) addButton("fastlist", "Quick Listing", false);
        const pageAnchor = document.querySelector("[href='#page0']");
        if (pageAnchor) {
            const itemList = document.querySelector(".item-list");
            pageAnchor.insertAdjacentHTML("afterbegin", `${itemList ? itemList.childElementCount : 0} `);
        }
        let totalPartValue = 0,
            totalPaintValue = 0;
        for (const e of document.querySelectorAll("[data-tradable='1']")) {
            if (e.hasAttribute("data-paint_price"))
                totalPaintValue += parsePrice(e.getAttribute("data-paint_price"));
            for (let a = 1; a <= 3; ++a)
                if (e.hasAttribute("data-part_price_" + a))
                    totalPartValue += parsePrice(e.getAttribute("data-part_price_" + a));
            label(e, JSON.parse(sessionStorage.getItem("annotate")),
                JSON.parse(sessionStorage.getItem("fastlist")),
                JSON.parse(sessionStorage.getItem("pricediff")));
        }
        totalPartValue = Math.floor(round(totalPartValue / 5) * 100) / 100;
        totalPaintValue = Math.floor(round(totalPaintValue / 5) * 100) / 100;
        console.info("Total part value: " + totalPartValue + " refined.");
        console.info("Total paint value: " + totalPaintValue + " refined.");
        displayText("Loaded");
    }

    function loadListings() {
        const single = !document.querySelector(".pagination"),
            first = single || document.querySelector(".pagination > li:first-child").className === "disabled",
            end = single || document.querySelector(".pagination > li:last-child").className === "disabled",
            buttons = document.getElementsByClassName("listing-relist"),
            items = JSON.parse(sessionStorage.getItem("toList")) || [];
        let last;
        if (localStorage.getItem("threadRunning") && !sessionStorage.getItem("mainThread")) {
            displayText("Terminated");
            return console.info(`Backpack.tf Script Terminated (Not Main Thread). Version ${GM_info.script.version}`);
        } else if (!localStorage.getItem("threadRunning")) {
            localStorage.setItem("threadRunning", null);
            sessionStorage.setItem("mainThread", null);
        } else if (document.querySelector("[class^='alert-']"))
            displayText("Terminated");
        if (items.length) {
            displayText(`Relisting Page ${sessionStorage.getItem("nextPage") - 1}`, true);
            sessionStorage.setItem("curItem", last = items.pop());
            sessionStorage.setItem("toList", JSON.stringify(items));
            location.assign(`https://backpack.tf/classifieds/relist/${last}`);
        } else if (buttons.length) {
            for (const e of buttons) items.push(e.href.slice(39));
            sessionStorage.setItem("curItem", last = items.pop());
            sessionStorage.setItem("toList", JSON.stringify(items));
            displayText("Saved IDs", true);
            location.assign(`https://backpack.tf/classifieds/relist/${last}`);
        } else if (first) {
            displayText(`Jumping to ${sessionStorage.getItem("nextPage")}`, true);
            location.assign(`${document.URL}&page=${sessionStorage.getItem("nextPage")}`);
        } else if (end) {
            localStorage.removeItem("threadRunning");
            sessionStorage.removeItem("mainThread");
            sessionStorage.removeItem("nextPage");
            const data = document.createElement("small"),
                reloadTime = randomTime ? range(randomMin * 60, randomMax * 60) : defaultTime * 60;
            data.style = "color: orange; float: right;";
            const heading = document.querySelector(".panel-heading");
            if (heading) heading.appendChild(data);
            if (relistInterval) {
                clearInterval(relistInterval);
                relistInterval = null;
            }
            let count = reloadTime;
            relistInterval = setInterval(() => { showStatus(data, count); count--; }, 1000);
            displayText("Finished");
        } else {
            sessionStorage.setItem("nextPage", +sessionStorage.getItem("nextPage") + !first);
            displayText("Moving");
            const angleRight = document.querySelector(".fa-angle-right");
            if (angleRight) angleRight.click();
        }
    }

    function loadListPage() {
        const status = /^https:\/\/backpack\.tf\/classifieds\/relist\/.*$/.test(document.URL) ? "relist" : "sell";
        const header = document.querySelector(".panel-heading > span");
        switch (status) {
        case "relist":
            displayText("Relisting Item", true);
            setTimeout(() => {
                displayText("Relisted", false);
                const placeListing = document.querySelector(".place-listing");
                if (placeListing) placeListing.click();
            }, range(1000, 1500));
            setTimeout(() => {
                displayText("Error... Reloading");
                location.reload();
            }, range(7500, 10000));
            break;
        default: {
            displayText("Loading");
            const item = document.querySelector(".item");
            if (!item) return;
            const attr = getAttr(item),
                title = attr["data-original-title"] || attr["title"],
                isKS = title.includes("Killstreak"),
                paint = attr["data-paint_name"],
                pIndex = attr["data-priceindex"],
                quality = attr["data-quality"],
                wearTier = attr["data-wear_tier"];
            let colour = 0,
                isAust = attr["data-australium"] || 0,
                name = attr["data-name"],
                price = attr["data-price"],
                tier = -1;
            if (keyP && price >= keyP && !name.includes("Key")) {
                const keysInput = document.getElementById("keys");
                if (keysInput) keysInput.value = Math.floor(price / keyP);
                price %= keyP;
            }
            price = Math.floor(round(price) * 100) / 100;
            const metalInput = document.getElementById("metal");
            if (metalInput) metalInput.value = price || "";
            if (isKS)
                tier = ["Professional", "Specialized", "Killstreak"].findIndex(e => title.includes(e));
            tier = ~tier ? 3 - tier : 0;
            let listNotes = notes || "";

            const parts = [];
            for (let a = 1; a <= 3; ++a) {
                if (attr[`data-part_name_${a}`]) {
                    parts.push(attr[`data-part_name_${a}`]);
                }
            }

            let partsNotes = "";
            if (parts.length) {
                partsNotes = parts[0];
                for (let part = 1; part < parts.length; ++part) {
                    if (part === parts.length - 1)
                        partsNotes += " & ";
                    else
                        partsNotes += ", ";
                    partsNotes += parts[part];
                }
                partsNotes += ". ";
            }
            listNotes = partsNotes + listNotes;

            let ksNotes = "";
            if (tier === 3) {
                ksNotes = `${attr["data-sheen"]} / ${attr["data-killstreaker"]}. `;
            } else if (tier === 2) {
                ksNotes = `${attr["data-sheen"]}. `;
            }
            listNotes = ksNotes + listNotes;

            if (attr["data-festivized"])
                listNotes = "Festivized. " + listNotes;

            const commentsInput = document.getElementById("listing-comments");
            if (commentsInput) commentsInput.value = listNotes;
            let extended = true;
            if (paint) colour = paintLookup[paint];
            if (isAust) name = name.slice(11);
            let url = `/classifieds?item=${name}&quality=${quality}` +
                `&tradable=${attr["data-tradable"]}&craftable=${attr["data-craftable"]}` +
                `&australium=${isAust}&killstreak_tier=${isKS * tier}`;
            if (colour) url += `&paint=${colour}`;
            if (attr["data-crate"])
                url += `&numeric=crate&comparison=eq&value=${attr["data-crate"]}`;
            else if (pIndex) {
                if (quality === 5) {
                    url += `&particle=${pIndex}`;
                } else {
                    extended = false;
                    url = "https://backpack.tf/stats/Unique/" + ksLookup[tier];
                    if (title.includes("Chemistry Set"))
                        url += "Chemistry Set/Tradable/Craftable/";
                    else if (title.includes("Fabricator"))
                        url += "Fabricator/Tradable/Craftable/";
                    else if (title.includes("Kit"))
                        url += "Kit/Tradable/Non-Craftable/";
                    else if (title.includes("Strangifier"))
                        url += "Strangifier/Tradable/Craftable/";
                    else return alert(`[Unhandled Item]\n${title}`);
                    url += pIndex;
                }
            } else if (wearTier) {
                extended = false;
                url = `https://backpack.tf/stats/${attr["data-q_name"]}/${name}/Tradable/Craftable/`;
            }
            console.info("Loading data from", url);
            HTTPRequest("GET", url, e => {
                const ele = new DOMParser().parseFromString(e, "text/html");
                let str;
                const firstCol = ele.querySelector(".col-md-6:nth-child(1)");
                const hasListings = firstCol && !firstCol.querySelector(".alert-info"),
                    craft = document.querySelector(".tag.top-left");
                let craftNum;
                if (craft) craftNum = craft.textContent.slice(1);
                if (craftNum && craftNum <= 100 && !attr["data-crate"] && !attr["data-quantity"]) {
                    str = ` (Low Craft #${craftNum})`;
                    const keysInput = document.getElementById("keys");
                    const metalInput = document.getElementById("metal");
                    if (keysInput) keysInput.value = "";
                    if (metalInput) metalInput.value = "";
                } else if (hasListings) {
                    const list = ele.querySelectorAll(".col-md-6:nth-child(1) [data-listing_price]"),
                        length = extended && !paint ? Math.min(5, list.length) : list.length,
                        lowest = list[0].getAttribute("data-listing_price"),
                        highest = list[length - 1].getAttribute("data-listing_price");
                    str = ` (${lowest} ~ ${highest} from ${length} Listing(s))`;
                } else {
                    str = " (No other listings found)";
                }
                if (tier > 1) {
                    str += " [";
                    if (attr["data-sheen"]) str += `${attr["data-sheen"]}`;
                    if (attr["data-killstreaker"]) str += `, ${attr["data-killstreaker"]}`;
                    str += "]";
                }
                if (paint && !paintLookup[name])
                    str += ` [Painted ${paint}]`;
                if (header) header.textContent += str;
                displayText("Loaded", false);
            });
            break;
        }
        }
    }
    let icon, stat, notes, ownProfile, refP, keyP;
    try {
        if (document.getElementById("login"))
            return console.info(`Backpack.tf Script Paused (Signed Out). Version ${GM_info.script.version}`);
        if (document.getElementById("cf-wrapper")) {
            console.info(`Backpack.tf Script Paused (Offline). Version ${GM_info.script.version}`);
            if (sessionStorage.getItem("mainThread"))
                setTimeout(() => location.reload(), 5000);
            return;
        }
        if (document.getElementsByClassName("cf-error-details").length) {
            console.info(`Backpack.tf Script Paused (Error). Version ${GM_info.script.version}`);
            if (sessionStorage.getItem("mainThread"))
                setTimeout(() => location.reload(), 5000);
            return;
        }

        /******** SCRIPT GLOBALS ********/
        const listPage = /^https:\/\/backpack\.tf\/classifieds\/(?:relist|sell)\/.*$/.test(document.URL),
            profile = /^https:\/\/backpack\.tf\/(?:id\/.+|profiles\/\d{17})(?:#page\d+)?$/.test(document.URL),
            classifieds = /^https:\/\/backpack\.tf\/profiles\/$/.test(document.URL),
            listings = document.querySelector(".listing-remove") && document.URL.includes("steamid="),
            lastUpdt = Date.now() - (+localStorage.getItem("lastupdt") || 0);
        const profileLink = document.querySelector("[href^='/profiles']");
        ownProfile = profileLink ? profileLink.href === document.URL.replace("#", "") : false;
        refP = +localStorage.getItem("refP") || 0;
        keyP = +localStorage.getItem("keyP") || 0;
        icon = createIcon("info-circle", "border: none");
        stat = document.createTextNode("Loading");
        notes = localStorage.getItem("notes");
        /****** END SCRIPT GLOBALS ******/

        if (!refP || !keyP || lastUpdt >= 864e5 * updateFreq)
            update();

        const diff = 864e5 * updateFreq - lastUpdt,
            days = Math.floor(diff / 864e5),
            hours = Math.floor((diff % 864e5) / 36e5),
            minutes = Math.floor((diff % 36e5) / 6e4);
        console.info(`Prices will update in ${days} day(s), ${hours} hour(s) and ${minutes} min(s)`);

        if (profile || listings || listPage) {
            const info = document.createElement("a");
            info.title = "Click to reset";
            info.style = "position: fixed; top: 45px; left: 2px; width: 150px;";
            info.classList.add("btn", "btn-info", "btn-sm");
            info.appendChild(icon);
            info.appendChild(stat);
            info.addEventListener("click", () => {
                if (!confirm("Are you sure?")) return;
                removeData();
                displayText("Reset");
                if (listPage) {
                    const tag = document.getElementsByClassName("fa-tag")[0];
                    if (tag) tag.click();
                } else {
                    location.reload();
                }
            });
            document.body.insertBefore(info, document.getElementById("helpers"));
            addButton("paused", "Paused", false);
        }

        if (sessionStorage.getItem("mainThread") && !JSON.parse(sessionStorage.getItem("paused"))) {
            if (profile || classifieds) {
                const tag = document.getElementsByClassName("fa-tag")[0];
                if (tag) return tag.click();
            }
        }

        if (profile) {
            check(() => document.getElementsByClassName("page-anchor").length > 0, () => loadProfile());
        } else if (listings || listPage) {
            sessionStorage.setItem("nextPage", sessionStorage.getItem("nextPage") || 2);
            if (JSON.parse(sessionStorage.getItem("paused"))) {
                displayText("Paused");
                return console.info(`Backpack.tf Script Paused. Version ${GM_info.script.version}`);
            }
        }

        if (listings) {
            loadListings();
        } else if (listPage) {
            loadListPage();
        }
        console.info(`Backpack.tf Script Loaded. Version ${GM_info.script.version}`);
    } catch (e) {
        displayText("Fatal Error");
        alert(`[A fatal error has occurred]\n${e.message}\n[Stack Trace]\n${e.stack}`);
    }
})();
