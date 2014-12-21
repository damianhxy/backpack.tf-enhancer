// ==UserScript==
// @copyright           2014, Damian Ho
// @description         Helper script for Backpack.tf
// @downloadURL         https://bitbucket.org/damianhxy/backpack.tf-enhancer/raw/master/relist.user.js
// @include             /^http:\/\/backpack\.tf.*$/
// @exclude             /^http:\/\/backpack\.tf\/api\/.*$/
// @name                Backpack.tf Enhancer
// @namespace           https://bitbucket.org/damianhxy
// @noframes
// @run-at              document-end
// @version             1.5.5.8
// ==/UserScript==

(function () {
    /*********** SETTINGS ***********/
    var randomTime = 1,              //[boolean] random reload time?
        randomRelist = 1,            //[boolean] random item relisted?
        defaultTime = 5,             //[minutes] default reload time
        randomMin = 3,               //[minutes] minimum random reload time
        randomMax = 10,              //[minutes] maximum random reload time
        updateFreq = 3,              //[days] price refresh frequency
        threshold = 0.22,            //[refined] threshold for paint indicator
        notes = localStorage.getItem("notes");
    /******** END OF SETTINGS *******/

    function addButton(prop, val, def, clr = false) {
        sessionStorage.setItem(prop, sessionStorage.getItem(prop) || def);
        var button = document.createElement("a"),
            text = document.createTextNode(" " + val),
            activated = JSON.parse(sessionStorage.getItem(prop));
        button.style = "margin: 2px; width: 125px;" + [" clear: both;", ""][+clr];
        button.className = "btn btn-" + ["danger", "success"][+activated] + " btn-sm pull-right";
        button.addEventListener("click", function() {
            window.stop();
            sessionStorage.setItem(prop, !JSON.parse(sessionStorage.getItem(prop)));
            location.reload();
        });
        button.appendChild(createIcon("toggle-" + ["off", "on"][+activated], "border: none;"));
        button.appendChild(text);
        document.getElementById("#navbar").appendChild(button);
    }

    function createIcon(cls, style, content) {
        var icon = document.createElement("i");
        icon.className = "fa fa-" + cls + " fa-inverse fa-border pull-left";
        icon.style = style;
        if (content)
            icon.appendChild(document.createTextNode(content));
        return icon;
    }

    function HTTPRequest(URL) {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", URL, false);
        xmlhttp.send();
        return xmlhttp.responseText;
    }

    function parsePrice(string) {
        var arr = string.split(" "),
            bud = 0,
            key = 0,
            ref = 0;
        arr.forEach(function(e, i) {
            if (e.contains("ref"))
                ref = +arr[i - 1];
            else if (e.contains("key"))
                key = +arr[i - 1];
            else if (e.contains("bud"))
                bud = +arr[i - 1];
        });
        return ref + key * keyP + bud * budP * keyP;
    }

    function range(lo, hi) {
        return Math.floor(Math.random() * (hi - lo + 1)) + lo;
    }

    function removeData() {
        localStorage.removeItem("threadRunning");
        ["reset", "mainThread", "curItem", "nextPage", "paused"].forEach(function(e) {
            sessionStorage.removeItem(e);
        });
        Object.keys(sessionStorage).forEach(function(e) {
            if (e.startsWith("itmdata-"))
                sessionStorage.removeItem(e);
        });
    }

    function round(num) {
        var val = +num;
        if (num > 5 / 90)
            val = Math.floor(val) + Math.round(val % 1 * 9) / 9;
        return val;
    }

    function showStatus() {
        if (reloadTime) {
            var min = Math.floor(reloadTime / 60),
                sec = reloadTime % 60;
            data.textContent = "Reloading classifieds in " + min + ":" + ("0" + sec).slice(-2);
            document.title = "Classifieds: " + min + ":" + ("0" + sec).slice(-2);
            reloadTime--;
        } else {
            document.querySelector(".fa-angle-double-left").click();
            clearInterval(showStatus);
        }
    }

    function update() {
        if (document.getElementById("login"))
            return console.info("Backpack.tf Script Paused (Signed Out). Version " + GM_info.script.version);
        if (!localStorage.getItem("apikey"))
            localStorage.setItem("apikey", prompt("API key not set, register yours from http://backpack.tf/api/"));
        if (localStorage.getItem("apikey").length !== 24) {
            alert("Incorrect API key length");
            localStorage.removeItem("apikey");
            update();
        }
        if (!localStorage.getItem("refP") || !localStorage.getItem("keyP") || !localStorage.getItem("budP") ||
            (new Date() - (Date.parse(localStorage.getItem("lastupdt")) || 0) >= 864e5 * updateFreq)) {
            var data = JSON.parse(HTTPRequest("http://backpack.tf/api/IGetPrices/v4/?key=" +
                                  localStorage.getItem("apikey")));
            if (!data.response.success) {
                if (data.response.message === "API key does not exist.") {
                    alert("Invalid API key");
                    localStorage.removeItem("apikey");
                    update();
                } else
                    return alert("Error: " + data.response.message);
            }
            var ref = data.response.raw_usd_value * 100,
                key = data.response.items["Mann Co. Supply Crate Key"].prices[6].Tradable.Craftable[0],
                bud = data.response.items.Earbuds.prices[6].Tradable.Craftable[0],
                r = (ref.value + (ref.value_high || ref.value)) / 2 * 100,
                k = (key.value + (key.value_high || key.value)) / 2,
                b = (bud.value + (bud.value_high || bud.value)) / 2,
                rDiff = "(" + (r === refP ? "=" : (r < refP ? "↓" : "↑")) + ")",
                kDiff = "(" + (k === keyP ? "=" : (k < keyP ? "↓" : "↑")) + ")",
                bDiff = "(" + (b === budP ? "=" : (b < budP ? "↓" : "↑")) + ")";
            localStorage.setItem("refP", r);
            localStorage.setItem("keyP", k);
            localStorage.setItem("budP", b);
            alert("Prices updated, Refined: " + r + " Cents " + rDiff + ", Keys: " + k + " Refined " + kDiff +
                  ", Earbuds: " + b + " Keys " + bDiff);
            localStorage.setItem("lastupdt", new Date());
            return location.reload();
        }
        var diff = 864e5 * updateFreq - (new Date() - Date.parse(localStorage.getItem("lastupdt"))),
            days = Math.floor(diff / 864e5),
            hours = Math.floor((diff % 864e5) / 36e5),
            minutes = Math.floor((diff % 36e5) / 6e4);
        console.info("Prices will update in " + days + " day(s), " + hours + " hour(s), and " + minutes + " min(s)");
    }

try {
    /******** SCRIPT GLOBALS ********/
    var listPage = document.URL.contains("/add"),
        profile = document.URL.contains("profiles"),
        listings = document.querySelector(".listing-remove") && document.URL.contains("steamid="),
        isSelf = document.querySelector(".dropdown-btn").href === document.URL,
        refP = +localStorage.getItem("refP"),
        keyP = +localStorage.getItem("keyP"),
        budP = +localStorage.getItem("budP");
    update();
    /****** END SCRIPT GLOBALS ******/

    if (profile || listings || listPage) {
        var stat = document.createElement("div");
        stat.style = "margin: 2px; width: 150px;";
        stat.className = "btn btn-info btn-sm pull-left";
        document.getElementById("#navbar").appendChild(stat);
        addButton("paused", "Paused", false, true);
    }

    if (profile) {
        if (sessionStorage.getItem("mainThread")) {
            var silent = JSON.parse(sessionStorage.getItem("silent"));
            stat.textContent = "Status: Interrupted";
            if (silent || confirm("Relisting was interrupted, now diagnosing...")) {
                var ele = document.createElement("html");
                ele.innerHTML += HTTPRequest("http://backpack.tf/classifieds/add/" + sessionStorage.getItem("curItem"));
                if (ele.querySelector(".avatar")) {
                    if (!silent)
                        alert("[" + sessionStorage.getItem("curItem") + "] invalid, removing");
                    sessionStorage.removeItem("itmdata-" + sessionStorage.getItem("curItem"));
                } else {
                    if (!silent)
                        alert("[" + sessionStorage.getItem("curItem") + "] valid, retrying");
                }
                stat.textContent = "Status: Returning";
                return document.querySelector(".fa-tag").click();
            } else
                removeData();
        }
        setTimeout(function() {
            document.querySelector("[href='#page0']").insertAdjacentHTML('afterbegin',
                     document.getElementById("newlist").children.length - 1 + " ");
        }, 1000);
        addButton("annotate", "Annotate", false);
        if (isSelf) {
            addButton("fastlist", "Fast Listing", false);
            addButton("pricediff", "Show Change", false);
            if (JSON.parse(sessionStorage.getItem("fastlist"))) {
                Array.prototype.forEach.call(document.getElementsByClassName("killstreaker"), function(e) {
                    e.style.display = "none";
                });
                Array.prototype.forEach.call(document.querySelectorAll(".item:not(.notrade):not(.spacer)"), function(e) {
                    if (!e.getAttribute("data-name").contains("Metal")) {
                        var listed = e.hasAttribute("data-listing-price"),
                            arr = (e.getAttribute("data-listing-date") || "").split(" "),
                            canRelist = !listed || +arr[0] >= 30 && arr[1].contains("minute") ||
                                        +arr[0] && arr[1].contains("hour"),
                            link = document.createElement("a");
                            link.href = "http://backpack.tf/classifieds/add/" + e.getAttribute("data-id");
                            link.appendChild(createIcon(listed ? "refresh" : "plus-square",
                                                        "position: absolute; bottom: 2px; left: 2px;" +
                                                        (canRelist ? "" : " background-color: red;")));
                        e.firstElementChild.appendChild(link);
                    }
                    if (e.hasAttribute("data-gifted-name")) {
                        e.querySelector(".fa-gift").style.display = "none";
                        e.firstElementChild.appendChild(createIcon("gift"));
                    }
                });
            }
        }
        if (JSON.parse(sessionStorage.getItem("annotate"))) {
            Array.prototype.forEach.call(document.getElementsByClassName("killstreaker"), function(e) {
                e.style.display = "none";
            });
            Array.prototype.forEach.call(document.getElementsByClassName("value"), function(e) {
                if (!e.parentNode.parentNode.hasAttribute("data-crate")) {
                    if (+e.textContent.split("#")[1] <= 100)
                        e.parentNode.insertBefore(createIcon("exclamation-triangle", null, e.textContent), e.nextSibling);
                    e.style.display = "none";
                }
            });
            Array.prototype.forEach.call(document.querySelectorAll("[data-tradable='1']"), function(e) {
                var box = e.firstElementChild;
                if (e.hasAttribute("data-paint-name")) {
                    if (e.getAttribute("data-paint-name") !== e.getAttribute("data-name"))
                        box.appendChild(createIcon("paint-brush"));
                }
                if (e.hasAttribute("data-part-1-name"))
                    box.appendChild(createIcon("cogs"));
                if (e.hasAttribute("data-spell-1"))
                    box.appendChild(createIcon("magic"));
                var title = e.getAttribute("data-default-name") || e.getAttribute("title");
                if (title.contains("Killstreak")) {
                    var colour = "#cd7f32";
                    if (title.contains("Specialized"))
                        colour = "#c0c0c0";
                    else if (title.contains("Professional"))
                        colour = "#ffd700";
                    box.appendChild(createIcon("bomb", "color: " + colour + "; background-color: white;"));
                }
            });
        }
        if (JSON.parse(sessionStorage.getItem("pricediff"))) {
            Array.prototype.forEach.call(document.getElementsByClassName("value"), function(e) {
                if (!e.parentNode.parentNode.hasAttribute("data-crate"))
                    e.style.display = "none";
            });
            Array.prototype.forEach.call(document.querySelectorAll("[data-tradable='1']"), function(e) {
                if (e.hasAttribute("data-listing-price") && +e.getAttribute("data-price")) {
                    var curP = +e.getAttribute("data-price"),
                        listP = parsePrice(e.getAttribute("data-listing-price")),
                        chg = Math.abs(curP - listP) >= threshold;
                    if (chg)
                        e.firstElementChild.appendChild(createIcon("level-" + chg ? curP > listP ? "up" : "down" : null,
                                                                   "background-color: white; color: red;"));
                }
            });
        }
        stat.textContent = "Status: Loaded";
    } else if (listings || listPage) {
        sessionStorage.setItem("nextPage", sessionStorage.getItem("nextPage") || 2);
        addButton("reset", "Reset", false);
        addButton("silent", "Silent", false);
        if (JSON.parse(sessionStorage.getItem("reset"))) {
            removeData();
            stat.textContent = "Status: Data Removed";
            return document.querySelector(".fa-tag").click();
        }
        if (JSON.parse(sessionStorage.getItem("paused"))) {
            stat.textContent = "Status: Paused";
            return console.info("Backpack.tf Script Paused. Version " + GM_info.script.version);
        }
        if (JSON.parse(sessionStorage.getItem("mainThread"))) {
            if (listPage || listings &&
                document.querySelector(".pagination-filters").lastElementChild.className !== "disabled") {
                var prev = 0;
                window.addEventListener("keydown", function(e) {
                    if (e.which === 87 && (prev === 224 || prev === 17))
                        localStorage.removeItem("threadRunning");
                    prev = e.which;
                });
            }
        }
    }

    if (listings) {
        var first = document.querySelector(".pagination-filters").firstElementChild.className === "disabled",
            last = document.querySelector(".pagination-filters").lastElementChild.className === "disabled",
            buttons = document.getElementsByClassName("listing-relist"),
            trades = Object.keys(sessionStorage).filter(function(e) {
                return e.startsWith("itmdata-");
            });
        if (localStorage.getItem("threadRunning") && !sessionStorage.getItem("mainThread")) {
            stat.textContent = "Status: Terminated";
            return console.info("Backpack.tf Script Terminated (Not Main Thread). Version " + GM_info.script.version);
        } else if (!localStorage.getItem("threadRunning")) {
            if (sessionStorage.getItem("mainThread") || trades.length || +sessionStorage.getItem("nextPage") !== 2) {
                stat.textContent = "Status: Unfresh Thread";
                document.activeElement.blur();
                if (confirm("Relisting was interrupted, now resetting...") ||
                    JSON.parse(sessionStorage.getItem("silent"))) {
                    sessionStorage.setItem("reset", true);
                    return document.querySelector(".fa-tag").click();
                }
            }
            localStorage.setItem("threadRunning", null);
            sessionStorage.setItem("mainThread", null);
        } else if (document.querySelector("alert-warning")) {
            stat.textContent = "Status: Infinite Loop";
            sessionStorage.removeItem("itmdata-" + sessionStorage.getItem("curItem"));
        }
        if (trades.length) {
            var id = trades[randomRelist ? range(0, trades.length - 1) : 0].slice(8);
            stat.textContent = "Status: Relisting Page " + (sessionStorage.getItem("nextPage") - 1);
            sessionStorage.setItem("curItem", id);
            location.assign("http://backpack.tf/classifieds/add/" + id);
        } else if (buttons.length) {
            Array.prototype.forEach.call(buttons, function(e) {
                sessionStorage.setItem("itmdata-" + e.href.slice(35), false);
            });
            stat.textContent = "Status: IDs Saved";
            sessionStorage.setItem("curItem", buttons[0].href.slice(35));
            location.assign("http://backpack.tf/classifieds/add/" + buttons[0].href.slice(35));
        } else if (first) {
            stat.textContent = "Status: Jumping...";
            location.assign(document.URL + "&page=" + sessionStorage.getItem("nextPage"));
        } else {
            if (last) {
                stat.textContent = "Status: Done Relisting";
                localStorage.removeItem("threadRunning");
                sessionStorage.removeItem("mainThread");
                sessionStorage.removeItem("nextPage");
                var data = document.createElement("small"),
                    reloadTime = randomTime ? range(randomMin * 60, randomMax * 60) : defaultTime * 60;
                data.style = "color: orange; float: right;";
                document.querySelector(".panel-heading").appendChild(data);
                setInterval(showStatus, 1000);
            } else {
                sessionStorage.setItem("nextPage", +sessionStorage.getItem("nextPage") + !first);
                stat.textContent = "Status: Moving...";
                document.querySelector(".fa-angle-right").click();
            }
        }
    } else if (listPage) {
        switch (document.querySelector(".item-overview").children[1].textContent.trim()) {
            case "Relisting this item":
                stat.textContent = "Status: Relisting...";
                sessionStorage.removeItem("itmdata-" + document.URL.slice(35));
                document.getElementById("button_save").click();
                break;
            case "Creating a new listing for this item":
                stat.textContent = "Status: Filling Fields";
                var itm = document.querySelector(".item"),
                    price = +itm.getAttribute("data-price"),
                    name = itm.getAttribute("data-name"),
                    title = itm.getAttribute("data-default-name") || itm.getAttribute("title"),
                    quality = +itm.getAttribute("data-quality"),
                    trade = +itm.getAttribute("data-tradable"),
                    craft = +itm.getAttribute("data-craftable"),
                    qualityN = itm.getAttribute("data-q-name"),
                    isAust = itm.hasAttribute("data-australium"),
                    hasPaint = itm.hasAttribute("data-paint-name"),
                    isKS = title.contains("Killstreak"),
                    colour = 0,
                    tier = 0;
                if (!price || title.contains("Killstreak")) {
                    document.querySelector(".col-2").firstElementChild.insertAdjacentHTML("beforeend", " (Unpriced)");
                    if (itm.hasAttribute("data-market-p"))
                        price = +itm.getAttribute("data-market-p") / refP;
                } else if (itm.getAttribute("data-p-bptf").contains("–"))
                    document.querySelector(".col-2").firstElementChild.insertAdjacentHTML("beforeend", " (Ranged)");
                if (price >= keyP && !name.contains("Key")) {
                    if (price >= keyP * budP && !name.contains("Earbuds")) {
                        document.getElementById("earbuds").value = Math.floor(price / (keyP * budP));
                        price %= keyP * budP;
                    }
                    document.getElementById("keys").value = Math.floor(price / keyP);
                    price %= keyP;
                }
                price = round(price);
                if (price % 1 >= 0.5)
                    price -= 0.005;
                price = +price.toFixed(2);
                document.getElementById("metal").value = price || "";
                document.getElementById("details").value = notes;
                if (hasPaint) {
                    var paint = {
                        "A Color Similar to Slate": "3100495",
                        "A Deep Commitment to Purple": "8208497",
                        "A Distinctive Lack of Hue": "1315860",
                        "A Mann's Mint": "12377523",
                        "After Eight": "2960676",
                        "Aged Moustache Grey": "8289918",
                        "An Air of Debonair": "6637376",
                        "An Extraordinary Abundance of Tinge": "15132390",
                        "Australium Gold": "15185211",
                        "Balaclavas Are Forever": "3874595",
                        "Color No. 216-190-216": "14204632",
                        "Cream Spirit": "12807213",
                        "Dark Salmon Injustice": "15308410",
                        "Drably Olive": "8421376",
                        "Indubitably Green": "7511618",
                        "Mann Co. Orange": "13595446",
                        "Muskelmannbraun": "10843461",
                        "Noble Hatter's Violet": "5322826",
                        "Operator's Overalls": "4732984",
                        "Peculiarly Drab Tincture": "12955537",
                        "Pink as Hell": "16738740",
                        "Radigan Conagher Brown": "6901050",
                        "Team Spirit": "12073019",
                        "The Bitter Taste of Defeat and Lime": "3329330",
                        "The Color of a Gentlemann's Business Pants": "15787660",
                        "The Value of Teamwork": "8400928",
                        "Waterlogged Lab Coat": "11049612",
                        "Ye Olde Rustic Colour": "8154199",
                        "Zepheniah's Greed": "4345659"
                    };
                    colour = paint[itm.getAttribute("data-paint-name")];
                }
                if (isKS) {
                    tier = 1;
                    if (title.contains("Specialized"))
                        tier = 2;
                    else if (title.contains("Professional"))
                        tier = 3;
                }
                var url = "http://backpack.tf/stats/" + qualityN + "/",
                    heading = document.getElementsByClassName("panel-heading")[1];
                if (!isKS && !hasPaint)
                    url += name + "/" + (trade ? "" : "Non-") + "Tradable/" + (craft ? "" : "Non-") + "Craftable";
                else if (title.contains("Fabricator"))
                    url += "Fabricator/Tradable/Craftable/" + itm.getAttribute("data-priceindex");
                else if (title.contains("Kit"))
                    url += "Kit/Tradable/Non-Craftable/" + itm.getAttribute("data-priceindex");
                else
                    url = "http://backpack.tf/classifieds/?item=" + name.slice(isAust * 11) +
                              "&quality=" + quality + "&tradable=" + trade + "&craftable=" + craft +
                              "&australium=" + +isAust + "&killstreak_tier=" + isKS * tier +
                              "&paint=" + colour;
                var ele = document.createElement("html"),
                    hasListings;
                ele.innerHTML += HTTPRequest(url);
                if ((!isKS || title.contains("Kit")) && !hasPaint)
                    hasListings = !ele.querySelector(".col-6").querySelector(".alert-info");
                else
                    hasListings = !ele.querySelector(".media-list").querySelector(".alert-info");
                if (hasListings) {
                    var list = ele.querySelector(".media-list").getElementsByClassName("item"),
                        lowest = list[0].getAttribute("data-listing-price"),
                        highest = list[list.length - 1].getAttribute("data-listing-price");
                    heading.textContent += " (" + lowest + " ~ " + highest + ", from " + list.length + " listings)";
                } else
                    heading.textContent += " (No other listings found)";
                if (isKS)
                    heading.textContent += " [Killstreak Tier " + tier + "]";
                else if (hasPaint)
                    heading.textContent += " [Painted " + itm.getAttribute("data-paint-name") + "]";
                stat.textContent = "Status: Loaded";
        }
    }
    console.info("Backpack.tf Script Loaded. Version " + GM_info.script.version);
} catch(e) {
    if (profile || listings || listPage)
        stat.textContent = "Status: Fatal Error";
    alert("[A fatal error has occured]\n" + e.message + "\n[Stack Trace]\n" + e.stack);
}
})();