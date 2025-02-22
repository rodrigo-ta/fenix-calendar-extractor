(async function () {
    const START_DATE = new Date("2025-02-17");
    const END_DATE = new Date("2025-07-25");
    const ICS_FILE_NAME = "university_schedule.ics"; // Editable file name
    let allEvents = [];

    function interceptResponses(callback) {
        let open = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function () {
            this.addEventListener("load", function () {
                if (this.responseText.startsWith("for(;;);")) {
                    let jsonResponse = this.responseText.slice(8); // Remove 'for(;;);'
                    try {
                        let parsedData = JSON.parse(jsonResponse);
                        callback(parsedData);
                    } catch (e) {
                        console.error("❌ Failed to parse JSON:", e);
                    }
                }
            });
            return open.apply(this, arguments);
        };
    }

    function extractRoomNumber(caption) {
        let match = caption.match(/- ([\d\.]+)\)/);
        return match ? match[1] : "";
    }

    function extractEventsFromResponse(jsonData) {
        let events = [];
        let stateEntry = jsonData.find(entry => entry.state && entry.state["162"]);
        if (stateEntry && stateEntry.state["162"].events) {
            events = stateEntry.state["162"].events.map(event => ({
                caption: event.caption,
                dateFrom: event.dateFrom,
                dateTo: event.dateTo,
                timeFrom: event.timeFrom,
                timeTo: event.timeTo,
                location: extractRoomNumber(event.caption) // Extract room number
            }));
        }
        return events;
    }

    function getDisplayedWeekEndDate() {
        let lastDayElement = document.querySelector(".v-calendar-header-day:last-child");
        if (lastDayElement) {
            let dateText = lastDayElement.textContent.trim().split(" ")[1];
            let formattedDate = dateText.split("-").reverse().join("-"); // Convert to YYYY-MM-DD
            return new Date(formattedDate);
        }
        return new Date("1900-01-01"); // Fallback if UI isn't found
    }

    function getRandomDelay() {
        return Math.floor(Math.random() * (1500 - 1000 + 1)) + 1000; // 1 to 1.5 seconds
    }

    async function clickNextWeekButton() {
        let btn = document.querySelector("#vaadin-screen span:nth-child(3)");
        if (btn) {
            btn.click();
            let waitTime = getRandomDelay();
            console.log(`⏭ Clicked 'Next Week'. Waiting ${waitTime / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, waitTime)); // Random delay
        } else {
            console.log("❌ 'Next Week' button not found!");
        }
    }

    function generateICS(events) {
        let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Custom Calendar Export//\n";
        events.forEach(event => {
            let start = event.dateFrom.replace(/-/g, "") + "T" + event.timeFrom.replace(/:/g, "").slice(0, 6);
            let end = event.dateTo.replace(/-/g, "") + "T" + event.timeTo.replace(/:/g, "").slice(0, 6);
            icsContent += `BEGIN:VEVENT\nSUMMARY:${event.caption}\nLOCATION:${event.location}\nDTSTART:${start}\nDTEND:${end}\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z\nEND:VEVENT\n`;
        });
        icsContent += "END:VCALENDAR";

        let blob = new Blob([icsContent], { type: "text/calendar" });
        let link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = ICS_FILE_NAME;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log("✅ ICS Downloaded: " + ICS_FILE_NAME);
    }

    interceptResponses(jsonData => {
        let events = extractEventsFromResponse(jsonData);
        events.forEach(event => {
            let eventDate = new Date(event.dateFrom);
            if (eventDate >= START_DATE && eventDate <= END_DATE) {
                allEvents.push(event);
            }
        });
        console.log(`📅 Collected ${events.length} events. Total: ${allEvents.length}`);
    });

    while (true) {
        let displayedWeekEnd = getDisplayedWeekEndDate();
        console.log(`📆 Displayed week ends on: ${displayedWeekEnd.toISOString().split("T")[0]}`);

        if (displayedWeekEnd > END_DATE) {
            console.log("✅ Reached the end of the semester. Stopping.");
            break;
        }

        await clickNextWeekButton();
    }

    console.log("📅 **Final Semester Events:**", allEvents);
    generateICS(allEvents);
})();
