// ==UserScript==
// @copyright           ©2014 - 2015, Damian Ho
// @description         Helper script for Backpack.tf
// @downloadURL         https://bitbucket.org/damianhxy/backpack.tf-enhancer/raw/master/relist.user.js
// @include             /^http:\/\/backpack\.tf.*$/
// @exclude             /^http:\/\/backpack\.tf\/developer$/
// @exclude             /^http:\/\/backpack\.tf\/api.*$/
// @grant               none
// @name                Backpack.tf Enhancer
// @namespace           https://bitbucket.org/damianhxy
// @noframes
// @run-at              document-end
// @version             1.6.8.8
// ==/UserScript==

(function () {
    /*********** SETTINGS ***********/
    var randomTime = 1,              //[boolean] random reload time?
        defaultTime = 5,             //[minutes] default reload time
        randomMin = 3,               //[minutes] minimum random reload time
        randomMax = 10,              //[minutes] maximum random reload time
        updateFreq = 3,              //[days] price refresh frequency
        threshold = 0.22;            //[refined] threshold for price changes
    /******** END OF SETTINGS *******/

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
            craft = ele.querySelector(".value"),
            title = attr["data-default-name"] || attr["title"];
        if (annotate || fastlist) {
            if (ele.querySelector(".killstreaker"))
                ele.querySelector(".killstreaker").remove();
            if (craft && !attr["data-crate"] && !attr["data-quantity"]) {
                if (+craft.textContent.slice(1) <= 100)
                    frag.appendChild(createIcon("exclamation-triangle"));
                craft.remove();
            }
            if (attr["data-gifted-name"]) {
                frag.appendChild(createIcon("gift"));
                ele.querySelector(".fa-gift").remove();
            }
        }
        if (fastlist && ownProfile) {
            if (attr["data-defindex"] < 5000 || attr["data-defindex"] > 5002) {
                var arr = (attr["data-listing-date"] || "").split(" "),
                    canRelist = +arr[0] >= 30 && arr[1].contains("minute") || arr[0] && arr[1].contains("hour");
                if (canRelist || !arr[0]) {
                    var link = document.createElement("a");
                    link.href = `http://backpack.tf/classifieds/sell/${attr["data-id"]}`;
                    link.appendChild(createIcon(arr[0] ? "refresh" : "plus", "position: absolute; bottom: 0; left: 0;"));
                    frag.appendChild(link);
                }
            }
        }
        if (change && attr["data-listing-price"]) {
            if (ele.querySelector(".value") && !attr["data-crate"])
                ele.querySelector(".value").style.display = "none";
            var curP = attr["data-price"],
                listP = parsePrice(attr["data-listing-price"]),
                diff = Math.abs(curP - listP);
            if (!curP)
                frag.appendChild(createIcon("question", "color: blueviolet; background-color: white;"));
            else if (diff >= threshold) {
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
            if (attr["data-paint-name"] && attr["data-paint-name"] !== attr["data-name"])
                frag.appendChild(createIcon("paint-brush"));
            if (attr["data-part-1-name"])
                frag.appendChild(createIcon("cogs"));
            if (attr["data-spell-1"])
                frag.appendChild(createIcon("magic"));
            if (title.contains("Killstreak")) {
                var colour = "darkgoldenrod";
                if (title.contains("Specialized"))
                    colour = "darkgray";
                else if (title.contains("Professional"))
                    colour = "gold";
                frag.appendChild(createIcon("bomb", `color: ${colour}; background-color: white;`));
            }
            if (attr["data-custom-name"] || attr["data-custom-desc"])
                frag.appendChild(createIcon("file-text"));
        }
        ele.firstElementChild.appendChild(frag);
    }

    function HTTPRequest(method, URL, callback) {
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
            return callback ? callback(xmlhttp.responseText) : xmlhttp.responseText;
        };
        xmlhttp.send();
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
        ["mainThread", "curItem", "nextPage", "paused", "toList", "relisted", "failed"].forEach(e => sessionStorage.removeItem(e));
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
            localStorage.setItem("apikey", prompt("API key not set, register yours from http://backpack.tf/api/"));
        if (localStorage.getItem("apikey").length !== 24) {
            alert("Incorrect API key length");
            localStorage.removeItem("apikey");
            // update();
        }
        displayText("Updating prices", true);
        HTTPRequest("GET", `http://backpack.tf/api/IGetPrices/v4/?key=${localStorage.getItem("apikey")}`, e => {
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

        /******** SCRIPT GLOBALS ********/
        var listPage = /^http:\/\/backpack\.tf\/classifieds\/(?:relist|sell)\/.*$/.test(document.URL),
            profile = /^http:\/\/backpack\.tf\/(?:id\/.+|profiles\/\d{17})(?:#page\d+)?$/.test(document.URL),
            ownProfile = document.querySelector("[href^='/profiles']").href === document.URL.replace("#", ""),
            classifieds = /^http:\/\/backpack\.tf\/classifieds$/.test(document.URL),
            listings = document.querySelector(".listing-remove") && document.URL.contains("steamid="),
            refP = +localStorage.getItem("refP"),
            keyP = +localStorage.getItem("keyP"),
            lastUpdt = Date.now() - (+localStorage.getItem("lastupdt") || 0),
            icon = createIcon("info-circle", "border: none"),
            stat = document.createTextNode("Loading"),
            notes = localStorage.getItem("notes"),
            relisted = JSON.parse(sessionStorage.getItem("relisted")) || [];
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

        if (sessionStorage.getItem("mainThread"))
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
                if (e.hasAttribute("data-paint-price"))
                    totalPaintValue += parsePrice(e.getAttribute("data-paint-price"));
                for (var a = 1; a <= 3; ++a)
                    if (e.hasAttribute("data-part-" + a + "-price"))
                        totalPartValue += parsePrice(e.getAttribute("data-part-" + a + "-price"));
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
            buttons.forEach((e, i) => {
                var itemID = e.parentElement.parentElement.parentElement.querySelector(".item").getAttribute("data-id");
                if (~ relisted.indexOf(itemID)) {
                    location.assign(`javascript:Listing.remove(${e.parentNode.parentNode.parentNode.id.slice(8)});`);
                    buttons.splice(i, 1);
                }
            });
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
                buttons.forEach(e => items.push(e.href.slice(38)));
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
                    sessionStorage.removeItem("relisted");
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
                    if (itemID)
                        relisted.push(itemID);
                    sessionStorage.setItem("relisted", JSON.stringify(relisted));
                    displayText("Relisting Item", true);
                    document.getElementById("button_save").click();
                    break;
                default:
                    displayText("Loading");
                    var attr = getAttr(document.querySelector(".item")),
                        colour = 0,
                        isAust = attr["data-australium"] || 0,
                        title = attr["data-default-name"] || attr["title"],
                        isKS = title.contains("Killstreak"),
                        name = attr["data-name"],
                        paint = attr["data-paint-name"],
                        pIndex = attr["data-priceindex"],
                        price = attr["data-price"],
                        quality = attr["data-quality"],
                        tier = 0;
                    if (price >= keyP && !name.contains("Key")) {
                        document.getElementById("keys").value = Math.floor(price / keyP);
                        price %= keyP;
                    }
                    price = Math.floor(round(price) * 100) / 100;
                    document.getElementById("metal").value = price || "";
                    document.getElementById("details").value = notes;
                    if (isKS)
                        tier = ["Professional", "Specialized", "Killstreak"].findIndex(e => title.contains(e));
                    tier = ~ tier ? 3 - tier : 0;
                    HTTPRequest("GET", "/pages/filter_meta", e => {
                        var data = JSON.parse(e),
                            extended = true;
                        if (paint)
                            colour = data.paint.find(e => e.name === paint).id;
                        if (isAust)
                            name = name.slice(11);
                        var url = `/classifieds/?item=${name.slice(isAust * 11)}&quality=${quality}` +
                                  `&tradable=${attr["data-tradable"]}&craftable=${attr["data-craftable"]}` +
                                  `&australium=${isAust}&paint=${colour}&killstreak_tier=${isKS * tier}`;
                        if (attr["data-crate"])
                            url += `&numeric=crate&comparison=eq&value=${attr["data-crate"]}`;
                        if (pIndex) {
                            if (quality === 5)
                                url += `&particle=${pIndex}`;
                            else if (!attr["data-crate"]) {
                                extended = false;
                                url = "http://backpack.tf/stats/Unique/";
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
                        } else if (isKS || ~ attr["data-query-string"].indexOf("skin") || attr["data-crate"])
                            url = "http://backpack.tf/classifieds?" + attr["data-query-string"];
                        HTTPRequest("GET", url, e => {
                            var ele = document.createElement("html"),
                                str;
                            ele.innerHTML += e;
                            var hasListings = !ele.querySelector(".col-md-6:nth-child(1) .alert-info"),
                                craft = document.querySelector(".value");
                            if (craft)
                                craft = craft.textContent.slice(1);
                            if (craft && craft <= 100 && !attr["data-crate"] && !attr["data-quantity"]) {
                                str = ` (Low Craft #${craft})`;
                                document.getElementById("keys").value = document.getElementById("metal").value = "";
                            } else if (hasListings) {
                                var list = ele.querySelectorAll(".col-md-6:nth-child(1) [data-listing-price]"),
                                    length = extended && !paint ? Math.min(5, list.length) : list.length,
                                    lowest = list[0].getAttribute("data-listing-price"),
                                    highest = list[length - 1].getAttribute("data-listing-price");
                                str = ` (${lowest} ~ ${highest} from ${length} Listing(s))`;
                            } else
                                str = " (No other listings found)";
                            if (isKS) {
                                str += ` [${data.killstreak_tiers[tier].name} Killstreak`;
                                if (attr["data-sheen"])
                                    str += `, ${attr["data-sheen"]}`;
                                if (attr["data-killstreaker"])
                                    str += `, ${attr["data-killstreaker"]}`;
                                str += "]";
                            }
                            else if (paint)
                                str += ` [Painted ${paint}]`;
                            document.getElementsByClassName("panel-heading")[0].textContent += str;
                            displayText("Loaded", false);
                        });
                    });
            }
        }
        console.info(`Backpack.tf Script Loaded. Version ${GM_info.script.version}`);
    } catch(e) {
        if (stat)
            displayText("Fatal Error");
        alert(`[A fatal error has occured]\n${e.message}\n[Stack Trace]\n${e.stack}`);
    }
})();