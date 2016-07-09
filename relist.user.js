// ==UserScript==
// @copyright           ©2014 - 2015, Damian Ho
// @description         Helper script for Backpack.tf
// @downloadURL         https://bitbucket.org/damianhxy/backpack.tf-enhancer/raw/master/relist.user.js
// @include             /^https:\/\/backpack\.tf.*$/
// @exclude             /^https:\/\/backpack\.tf\/developer$/
// @exclude             /^https:\/\/backpack\.tf\/api.*$/
// @grant               none
// @name                Backpack.tf Enhancer
// @namespace           https://bitbucket.org/damianhxy
// @noframes
// @run-at              document-end
// @version             1.7.0.6
// ==/UserScript==

(function () {
    /*********** SETTINGS ***********/
    var randomTime = 1,              //[boolean] random reload time?
        defaultTime = 5,             //[minutes] default reload time
        randomMin = 3,               //[minutes] minimum random reload time
        randomMax = 10,              //[minutes] maximum random reload time
        updateFreq = 3,              //[days] price refresh frequency
        threshold = 5,               //[percent] threshold for price changes
        absThreshold = 0.11;         //[refined] absolute threshold
    /******** END OF SETTINGS *******/

    /*********** CONSTANT ***********/
    var paintLookup = {
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

    var ksLookup = ["", "Killstreak ", "Specialized Killstreak ", "Professional Killstreak "];
    /******** END OF CONSTANT *******/

    function addButton(prop, val, def) {
        sessionStorage.setItem(prop, sessionStorage.getItem(prop) || def);
        var button = document.createElement("a"),
            activated = JSON.parse(sessionStorage.getItem(prop)),
            curNum = document.querySelectorAll(".btn.btn-sm").length  - 1;
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
        var icon = document.createElement("i");
        icon.classList.add("fa", `fa-${cls}`, "fa-inverse", "fa-border", "pull-left");
        icon.style = `border-radius: 50%;${style ? " " + style : ""}`;
        return icon;
    }

    function displayText(msg, spinner) {
        if (!stat)
            return;
        if (msg)
            stat.textContent = msg;
        if (spinner !== undefined) {
            icon.classList.toggle("fa-info-circle", !spinner);
            icon.classList.toggle("fa-refresh", spinner);
            icon.classList.toggle("fa-spin", spinner);
        }
    }

    function getAttr(ele) {
        var attr = {};
        Array.prototype.forEach.call(ele.attributes, e => attr[e.name] = isNaN(+e.value) ? e.value : +e.value);
        return attr;
    }

    function label(ele, annotate, fastlist, change) {
        var frag = document.createDocumentFragment(),
            attr = getAttr(ele),
            craft = ele.querySelector(".tag.top-left"),
            title = attr["data-default_name"] || attr["title"];
        if (annotate || fastlist) {
            if (ele.querySelector(".killstreaker"))
                ele.querySelector(".killstreaker").remove();
            if (craft && !attr["data-crate"] && !attr["data-quantity"]) {
                if (+craft.textContent.slice(1) <= 100)
                    frag.appendChild(createIcon("exclamation-triangle"));
                craft.remove();
            }
            if (attr["data-gifted_name"]) {
                frag.appendChild(createIcon("gift"));
                ele.querySelector(".fa-gift").remove();
            }
            if (ele.querySelector(".tag.top-left")) {
                ele.querySelector(".tag.top-left").classList.add("top-right");
                ele.querySelector(".tag.top-left.top-right").classList.remove("top-left");
            }
        }
        if (fastlist && ownProfile) {
            if (attr["data-defindex"] < 5000 || attr["data-defindex"] > 5002) {
                var arr = (attr["data-listing_date"] || "").split(" "),
                    canRelist = +arr[0] >= 30 && arr[1].contains("minute") || arr[0] && arr[1].contains("hour");
                var link = document.createElement("a");
                link.href = `http://backpack.tf/classifieds/sell/${attr["data-id"]}`;
                link.appendChild(createIcon(arr[0] ? "refresh" : "plus", "position: absolute; bottom: 0; left: 0; color: " + (canRelist || !arr[0] ? "white;": "red;")));
                frag.appendChild(link);
                if (arr[0]) {
                    var link = document.createElement("a");
                    link.href = "#";
                    link.appendChild(createIcon("times", "position: absolute; bottom: 20px; left: 0;"));
                    link.addEventListener("click", e => {
                        e.preventDefault();
                        e.stopPropagation();
                        HTTPRequest("POST", "/classifieds/remove/440_" + attr["data-id"], f => {
                            var parent = e.target.parentElement;
                            var relistSlot = parent.previousElementSibling;
                            relistSlot.firstElementChild.remove();
                            relistSlot.appendChild(createIcon("plus", "position: absolute; bottom: 0; left: 0;"));
                            var change = parent.nextElementSibling;
                            if (change !== null)
                                change.remove();
                            var price = parent.parentElement.nextElementSibling;
                            price.remove();
                            parent.remove();
                        }, `user-id=${unsafeWindow.userID}`);
                    });
                    frag.appendChild(link);
                }
            }
        }
        if (change && attr["data-listing_price"]) {
            if (ele.querySelector(".value") && !attr["data-crate"])
                ele.querySelector(".value").style.display = "none";
            var curP = attr["data-price"],
                listP = parsePrice(attr["data-listing_price"]),
                diff = Math.abs(100 - (curP / listP) * 100),
                absDiff = Math.abs(curP - listP);
            if (!curP)
                frag.appendChild(createIcon("question", "color: blueviolet; background-color: white;"));
            else if (diff >= threshold && absDiff >= absThreshold) {
                var colour = "lime";
                if (diff >= threshold * 2 && diff <= threshold * 4)
                    colour = "goldenrod";
                else if (diff > threshold * 4)
                    colour = "crimson";
                frag.appendChild(createIcon(`level-${curP > listP ? "up" : "down"}`, `color: ${colour}` +
                                            "; background-color: white;"));
            }
        }
        if (annotate) {
            if (attr["data-paint_name"] && attr["data-paint_name"] !== attr["data-name"])
                frag.appendChild(createIcon("paint-brush"));
            if (attr["data-part_name_1"])
                frag.appendChild(createIcon("cogs"));
            if (attr["data-spell_1"])
                frag.appendChild(createIcon("magic"));
            if (title.contains("Killstreak")) {
                var colour = "darkgoldenrod";
                if (title.contains("Specialized"))
                    colour = "darkgray";
                else if (title.contains("Professional"))
                    colour = "gold";
                frag.appendChild(createIcon("bomb", `color: ${colour}; background-color: white;`));
            }
            if (attr["data-custom_name"] || attr["data-custom_desc"])
                frag.appendChild(createIcon("file-text"));
        }
        ele.firstElementChild.appendChild(frag);
    }

    function HTTPRequest(method, URL, callback, data) {
        displayText("Sending", true);
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open(method, URL, callback);
        xmlhttp.onreadystatechange = () => {
            displayText(`[${xmlhttp.readyState}, ${xmlhttp.status}]`);
            if (xmlhttp.readyState === 4 && xmlhttp.status !== 200)
                displayText("Request Error", false);
        };
        xmlhttp.onload = () => {
            displayText("Received", false);
            return callback(xmlhttp.responseText);
        };
        xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xmlhttp.send(data);
    }

    function parsePrice(str) {
        var arr = str.split(" "),
            key = 0,
            ref = 0;
        if (arr[0].contains("–")) {
            var pts = arr[0].split("–");
            arr[0] = ((+pts[0] + +pts[1]) / 2).toString();
        }
        arr.forEach((e, i) => {
            if (e.contains("ref"))
                ref = +arr[i - 1];
            else if (e.contains("key"))
                key = +arr[i - 1];
        });
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
        if (num <= 5 / 90)
            return num;
        num += num * 10 % 1 / 90;
        return Math.floor(num) + Math.round((num % 1 * 9).toFixed(2)) / 9;
    }

    function showStatus() {
        if (reloadTime) {
            var min = Math.floor(reloadTime / 60),
                sec = reloadTime-- % 60;
            data.textContent = `Reloading classifieds in ${min}:${("0" + sec).slice(-2)}`;
            document.title = `Classifieds: ${min}:${("0" + sec).slice(-2)}`;
        } else {
            document.querySelector(".fa-angle-double-left").click();
            clearInterval(showStatus);
        }
    }

    function update() {
        if (sessionStorage.getItem("mainThread"))
            return console.info(`Price updating suppressed`);
        if (!localStorage.getItem("apikey"))
            localStorage.setItem("apikey", prompt("API key not set, register yours from https://backpack.tf/developer/"));
        if (localStorage.getItem("apikey").length !== 24) {
            alert("Incorrect API key length");
            localStorage.removeItem("apikey");
        }
        displayText("Updating prices", true);
        HTTPRequest("GET", `https://backpack.tf/api/IGetPrices/v4/?key=${localStorage.getItem("apikey")}`, e => {
            var data = JSON.parse(e);
            if (!data.response.success)
                return console.info(`Error:\n${data.response.message}`);
            var key = data.response.items["Mann Co. Supply Crate Key"].prices[6].Tradable.Craftable[0],
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

    try {
        if (document.getElementById("login"))
            return console.info(`Backpack.tf Script Paused (Signed Out). Version ${GM_info.script.version}`);
        if (document.getElementById("cf-wrapper")) {
            console.info(`Backpack.tf Script Paused (Offline). Version ${GM_info.script.version}`);
            if (sessionStorage.getItem("mainThread"))
                setTimeout(() => location.assign(document.URL), 5000);
            return;
        }

        /******** SCRIPT GLOBALS ********/
        var listPage = /^https:\/\/backpack\.tf\/classifieds\/(?:relist|sell)\/.*$/.test(document.URL),
            profile = /^https:\/\/backpack\.tf\/(?:id\/.+|profiles\/\d{17})(?:#page\d+)?$/.test(document.URL),
            ownProfile = document.querySelector("[href^='/profiles']").href === document.URL.replace("#", ""),
            classifieds = /^https:\/\/backpack\.tf\/profiles\/$/.test(document.URL),
            listings = document.querySelector(".listing-remove") && document.URL.contains("steamid="),
            refP = +localStorage.getItem("refP"),
            keyP = +localStorage.getItem("keyP"),
            lastUpdt = Date.now() - (+localStorage.getItem("lastupdt") || 0),
            icon = createIcon("info-circle", "border: none"),
            stat = document.createTextNode("Loading"),
            notes = localStorage.getItem("notes");
        /****** END SCRIPT GLOBALS ******/

        if (refP && keyP && lastUpdt < 864e5 * updateFreq || update()) {
            var diff = 864e5 * updateFreq - lastUpdt,
                days = Math.floor(diff / 864e5),
                hours = Math.floor((diff % 864e5) / 36e5),
                minutes = Math.floor((diff % 36e5) / 6e4);
            console.info(`Prices will update in ${days} day(s), ${hours} hour(s) and ${minutes} min(s)`);
        }

        if (profile || listings || listPage) {
            var info = document.createElement("a");
            info.title = "Click to reset";
            info.style = "position: fixed; top: 45px; left: 2px; width: 150px;";
            info.classList.add("btn", "btn-info", "btn-sm");
            info.appendChild(icon);
            info.appendChild(stat);
            info.addEventListener("click", () => {
                if (!confirm("Are you sure?")) return;
                removeData();
                displayText("Resetted");
                if (listPage)
                    document.getElementsByClassName("fa-tag")[0].click();
                else
                    location.reload();
            });
            document.body.insertBefore(info, document.getElementById("helpers"));
            addButton("paused", "Paused", false);
        }

        if (sessionStorage.getItem("mainThread") && !JSON.parse(sessionStorage.getItem("paused")))
            if (profile || classifieds)
                return document.getElementsByClassName("fa-tag")[0].click();

        if (profile) {
            addButton("annotate", "Annotate", false);
            addButton("pricediff", "Show Change", false);
            if (ownProfile)
                addButton("fastlist", "Quick Listing", false);
            check(() => {
                return document.getElementsByClassName("page-anchor").length;
            }, () => {
                if (document.querySelector("[href='#page0']"))
                    document.querySelector("[href='#page0']").insertAdjacentHTML('afterbegin',
                        `${document.querySelector(".item-list").childElementCount} `);
            });
            var totalPartValue = 0,
                totalPaintValue = 0;
            Array.prototype.forEach.call(document.querySelectorAll("[data-tradable='1']"), e => {
                if (e.hasAttribute("data-paint_price"))
                    totalPaintValue += parsePrice(e.getAttribute("data-paint_price"));
                for (var a = 1; a <= 3; ++a)
                    if (e.hasAttribute("data-part_price_" + a))
                        totalPartValue += parsePrice(e.getAttribute("data-part_price_" + a));
                label(e, JSON.parse(sessionStorage.getItem("annotate")),
                      JSON.parse(sessionStorage.getItem("fastlist")),
                      JSON.parse(sessionStorage.getItem("pricediff")));
            });
            totalPartValue = Math.floor(round(totalPartValue / 2) * 100) / 100;
            totalPaintValue = Math.floor(round(totalPaintValue / 2) * 100) / 100;
            console.info("Total part value: " + totalPartValue + " refined.");
            console.info("Total paint value: " + totalPaintValue + " refined.");
            displayText("Loaded");
        } else if (listings || listPage) {
            sessionStorage.setItem("nextPage", sessionStorage.getItem("nextPage") || 2);
            if (JSON.parse(sessionStorage.getItem("paused"))) {
                displayText("Paused");
                return console.info(`Backpack.tf Script Paused. Version ${GM_info.script.version}`);
            }
        }

        if (listings) {
            var single = !document.querySelector(".pagination"),
                first = single || document.querySelector(".pagination > li:first-child").className === "disabled",
                end = single || document.querySelector(".pagination > li:last-child").className === "disabled",
                buttons = Array.prototype.slice.call(document.getElementsByClassName("listing-relist")),
                items = JSON.parse(sessionStorage.getItem("toList")) || [],
                last;
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
                location.assign(`http://backpack.tf/classifieds/relist/${last}`);
            } else if (buttons.length) {
                buttons.forEach(e => items.push(e.href.slice(39)));
                sessionStorage.setItem("curItem", last = items.pop());
                sessionStorage.setItem("toList", JSON.stringify(items));
                displayText("Saved IDs", true);
                location.assign(`http://backpack.tf/classifieds/relist/${last}`);
            } else if (first) {
                displayText(`Jumping to ${sessionStorage.getItem("nextPage")}`, true);
                location.assign(`${document.URL}&page=${sessionStorage.getItem("nextPage")}`);
            } else {
                if (end) {
                    localStorage.removeItem("threadRunning");
                    sessionStorage.removeItem("mainThread");
                    sessionStorage.removeItem("nextPage");
                    var data = document.createElement("small"),
                        reloadTime = randomTime ? range(randomMin * 60, randomMax * 60) : defaultTime * 60;
                    data.style = "color: orange; float: right;";
                    document.querySelector(".panel-heading").appendChild(data);
                    setInterval(showStatus, 1000);
                    displayText("Finished");
                } else {
                    sessionStorage.setItem("nextPage", +sessionStorage.getItem("nextPage") + !first);
                    displayText("Moving");
                    document.querySelector(".fa-angle-right").click();
                }
            }
        } else if (listPage) {
            switch (document.querySelector(".item-panel > h2").textContent.trim()) {
                case "Relisting this item":
                    var itemID = document.querySelector(".item").getAttribute("data-id");
                    displayText("Relisting Item", true);
                    document.getElementById("button_save").click();
                    break;
                default:
                    displayText("Loading");
                    var attr = getAttr(document.querySelector(".item")),
                        colour = 0,
                        isAust = attr["data-australium"] || 0,
                        title = attr["data-original-title"] || attr["title"],
                        isKS = title.contains("Killstreak"),
                        name = attr["data-name"],
                        paint = attr["data-paint_name"],
                        pIndex = attr["data-priceindex"],
                        price = attr["data-price"],
                        quality = attr["data-quality"],
                        tier = -1;
                    if (price >= keyP && !name.contains("Key")) {
                        document.getElementById("keys").value = Math.floor(price / keyP);
                        price %= keyP;
                    }
                    price = Math.floor(round(price) * 100) / 100;
                    document.getElementById("metal").value = price || "";
                    if (isKS)
                        tier = ["Professional", "Specialized", "Killstreak"].findIndex(e => title.contains(e));
                    tier = ~ tier ? 3 - tier : 0;
                    var listNotes = notes;

                    var parts = [];
                    for (var a = 1; a <= 3; ++a) {
                        if (attr[`data-part_name_${a}`]) {
                            parts.push(attr[`data-part_name_${a}`]);
                        }
                    }

                    var partsNotes = "";
                    if (parts.length) {
                        partsNotes = parts[0];
                        for (var part = 1; part < parts.length; ++part) {
                            if (part === parts.length - 1)
                                partsNotes += " & ";
                            else
                                partsNotes += ", ";
                            partsNotes += parts[part];
                        }
                        partsNotes += ". ";
                    }
                    listNotes = partsNotes + listNotes;

                    var ksNotes = "";
                    if (tier === 3) {
                        ksNotes = `${attr["data-sheen"]} / ${attr["data-killstreaker"]}. `;
                    } else if (tier === 2) {
                        ksNotes = `${attr["data-sheen"]}. `;
                    }
                    listNotes = ksNotes + listNotes;

                    if (attr["data-wear_tier"])
                        listNotes = `${attr["data-wear_tier"]}. ` + listNotes;

                    document.getElementById("details").value = listNotes;
                    var extended = true;
                    if (paint)
                        colour = paintLookup[paint];
                    if (isAust)
                        name = name.slice(11);
                    var url = `/classifieds?item=${name}&quality=${quality}` +
                              `&tradable=${attr["data-tradable"]}&craftable=${attr["data-craftable"]}` +
                              `&australium=${isAust}&killstreak_tier=${isKS * tier}`;
                    if (colour)
                        url += `&paint=${colour}`;
                    if (attr["data-crate"])
                        url += `&numeric=crate&comparison=eq&value=${attr["data-crate"]}`;
                    else if (pIndex) {
                        if (quality === 5)
                            url += `&particle=${pIndex}`;
                        else {
                            extended = false;
                            url = "https://backpack.tf/stats/Unique/" + ksLookup[tier];
                            if (title.contains("Chemistry Set"))
                                url += "Chemistry Set/Tradable/Craftable/";
                            else if (title.contains("Fabricator"))
                                url += "Fabricator/Tradable/Craftable/";
                            else if (title.contains("Kit"))
                                url += "Kit/Tradable/Non-Craftable/";
                            else if (title.contains("Strangifier"))
                                url += "Strangifier/Tradable/Craftable/";
                            else return alert(`[Unhandled Item]\n${title}`);
                            url += pIndex;
                        }
                    }
                    HTTPRequest("GET", url, e => {
                        var ele = document.createElement("html"),
                            str;
                        ele.innerHTML += e;
                        var hasListings = !ele.querySelector(".col-md-6:nth-child(1)").querySelector(".alert-info"),
                            craft = document.querySelector(".tag.top-left");
                        if (craft)
                            craft = craft.textContent.slice(1);
                        if (craft && craft <= 100 && !attr["data-crate"] && !attr["data-quantity"]) {
                            str = ` (Low Craft #${craft})`;
                            document.getElementById("keys").value = document.getElementById("metal").value = "";
                        } else if (hasListings) {
                            var list = ele.querySelectorAll(".col-md-6:nth-child(1) [data-listing_price]"),
                                length = extended && !paint ? Math.min(5, list.length) : list.length,
                                lowest = list[0].getAttribute("data-listing_price"),
                                highest = list[length - 1].getAttribute("data-listing_price");
                            str = ` (${lowest} ~ ${highest} from ${length} Listing(s))`;
                        } else
                            str = " (No other listings found)";
                        if (tier > 1) {
                            str += " [";
                            if (attr["data-sheen"])
                                str += `${attr["data-sheen"]}`;
                            if (attr["data-killstreaker"])
                                str += `, ${attr["data-killstreaker"]}`;
                            str += "]";
                        }
                        if (paint && !paintLookup[name])
                            str += ` [Painted ${paint}]`;
                        document.getElementsByClassName("panel-heading")[0].textContent += str;
                        displayText("Loaded", false);
                    });
            }
        }
        console.info(`Backpack.tf Script Loaded. Version ${GM_info.script.version}`);
    } catch(e) {
        displayText("Fatal Error");
        alert(`[A fatal error has occured]\n${e.message}\n[Stack Trace]\n${e.stack}`);
    }
})();
