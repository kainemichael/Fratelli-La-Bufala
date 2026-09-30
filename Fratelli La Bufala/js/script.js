const BOLT_FOOD_URL =
    "https://food.bolt.eu/en/324-valletta/p/54297-fratelli-la-bufala/";


document.addEventListener("DOMContentLoaded", () => {

    if (document.body.classList.contains("story-page")) {
        document.body.classList.add("story-js-ready");
    }

    document.querySelectorAll("[data-bolt-link]").forEach(link => {
        link.href = BOLT_FOOD_URL;
        link.target = "_blank";
        link.rel = "noopener";
    });

    const openingHourRows =
        document.querySelectorAll(".hours-table tbody tr[data-day]");

    if (openingHourRows.length) {
        const maltaDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Europe/Malta",
            weekday: "long",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23"
        });

        function getMaltaDateTime(date) {
            return Object.fromEntries(
                maltaDateTimeFormatter
                    .formatToParts(date)
                    .filter(part => part.type !== "literal")
                    .map(({ type, value }) => [type, value])
            );
        }

        function getMaltaDateKey(date) {
            const { year, month, day } = getMaltaDateTime(date);
            return `${year}-${month}-${day}`;
        }

        function millisecondsUntilNextMaltaMidnight(now) {
            const today = getMaltaDateKey(now);
            let low = now.getTime();
            let high = low + 26 * 60 * 60 * 1000;

            while (getMaltaDateKey(new Date(high)) === today) {
                high += 60 * 60 * 1000;
            }

            while (high - low > 1) {
                const middle = Math.floor((low + high) / 2);

                if (getMaltaDateKey(new Date(middle)) === today) {
                    low = middle;
                } else {
                    high = middle;
                }
            }

            return high - now.getTime();
        }

        function updateCurrentDay() {
            const now = new Date();
            const currentDay = getMaltaDateTime(now).weekday.toLowerCase();

            openingHourRows.forEach(row => {
                const isCurrentDay = row.dataset.day === currentDay;
                const todayLabel = row.querySelector(".hours-today");

                row.classList.toggle("is-current-day", isCurrentDay);

                if (isCurrentDay) {
                    row.setAttribute("aria-current", "date");
                } else {
                    row.removeAttribute("aria-current");
                }

                if (todayLabel) {
                    todayLabel.hidden = !isCurrentDay;
                }
            });

            window.setTimeout(
                updateCurrentDay,
                millisecondsUntilNextMaltaMidnight(now) + 50
            );
        }

        const openingStatus =
            document.querySelector("[data-opening-status]");
        const openingStatusText =
            document.querySelector("[data-opening-status-text]");

        function updateOpeningStatus() {
            if (!openingStatus || !openingStatusText) return;

            const maltaNow = getMaltaDateTime(new Date());
            const currentDay = maltaNow.weekday.toLowerCase();
            const todayRow = Array.from(openingHourRows).find(
                row => row.dataset.day === currentDay
            );
            const currentMinutes =
                Number(maltaNow.hour) * 60 + Number(maltaNow.minute);
            const isOpen = todayRow && Array.from(
                todayRow.querySelectorAll("td[data-label]")
            ).some(cell => {
                const [start, end] = cell.textContent
                    .trim()
                    .split(/\s*(?:–|-)\s*/)
                    .map(time => {
                        const [hours, minutes] = time.split(":").map(Number);
                        return hours * 60 + minutes;
                    });

                return Number.isFinite(start) &&
                    Number.isFinite(end) &&
                    currentMinutes >= start &&
                    currentMinutes < end;
            });

            openingStatus.dataset.state = isOpen ? "open" : "closed";
            openingStatusText.textContent = isOpen ? "Open now" : "Closed now";
        }

        updateCurrentDay();
        updateOpeningStatus();
        window.setInterval(updateOpeningStatus, 60 * 1000);
    }


    const reservationForm =
        document.querySelector("[data-reservation-form]");

    if (reservationForm) {
        const reservationFields = Array.from(
            reservationForm.querySelectorAll("[required]")
        );
        const dateInput = reservationForm.querySelector('input[name="date"]');
        const reservationSuccess =
            document.querySelector("[data-reservation-success]");
        const resetRequestButton =
            document.querySelector("[data-reservation-reset]");
        const maltaCalendarFormatter = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Europe/Malta",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        });
        let hasAttemptedSubmit = false;

        function getMaltaToday() {
            const parts = Object.fromEntries(
                maltaCalendarFormatter
                    .formatToParts(new Date())
                    .filter(part => part.type !== "literal")
                    .map(({ type, value }) => [type, value])
            );

            return `${parts.year}-${parts.month}-${parts.day}`;
        }

        function validateReservationField(field) {
            const error = document.getElementById(`${field.id}-error`);
            let message = "";

            if (field.type === "date") {
                const today = getMaltaToday();
                field.min = today;

                if (!field.value) {
                    message = "Choose a date for your request.";
                } else if (field.value < today) {
                    message = "Choose today or a future date.";
                }
            } else if (!field.value.trim()) {
                message = "This field is required.";
            } else if (field.type === "email" && field.validity.typeMismatch) {
                message = "Enter a valid email address.";
            }

            if (message) {
                field.setAttribute("aria-invalid", "true");
                if (error) error.textContent = message;
                return false;
            }

            field.removeAttribute("aria-invalid");
            if (error) error.textContent = "";
            return true;
        }

        if (dateInput) {
            dateInput.min = getMaltaToday();
        }

        reservationFields.forEach(field => {
            field.addEventListener("input", () => {
                if (hasAttemptedSubmit) validateReservationField(field);
            });

            field.addEventListener("change", () => {
                if (hasAttemptedSubmit) validateReservationField(field);
            });
        });

        reservationForm.addEventListener("submit", event => {
            event.preventDefault();
            hasAttemptedSubmit = true;

            const invalidFields = reservationFields.filter(
                field => !validateReservationField(field)
            );

            if (invalidFields.length) {
                invalidFields[0].focus();
                return;
            }

            reservationForm.hidden = true;
            reservationSuccess.hidden = false;
            reservationSuccess.focus();
        });

        if (resetRequestButton) {
            resetRequestButton.addEventListener("click", () => {
                reservationForm.reset();
                hasAttemptedSubmit = false;

                reservationFields.forEach(field => {
                    field.removeAttribute("aria-invalid");
                    const error = document.getElementById(`${field.id}-error`);
                    if (error) error.textContent = "";
                });

                if (dateInput) dateInput.min = getMaltaToday();
                reservationSuccess.hidden = true;
                reservationForm.hidden = false;
                dateInput?.focus();
            });
        }
    }

    /* =====================================================
       ICONS
    ====================================================== */

    if (window.lucide) {
        lucide.createIcons();
    }


    /* =====================================================
       FIXED NAVIGATION
    ====================================================== */

    const navbar = document.querySelector("[data-navbar]");
    const hero = document.querySelector(".hero, .story-hero");

    function updateNavbar() {

        if (!navbar || !hero) return;

        const heroBottom =
            hero.getBoundingClientRect().bottom;

        navbar.classList.toggle(
            "nav-scrolled",
            heroBottom <= 80
        );
    }

    updateNavbar();

    window.addEventListener(
        "scroll",
        updateNavbar,
        { passive: true }
    );


    /* =====================================================
       MOBILE MENU
    ====================================================== */

    const menuToggle =
        document.querySelector("[data-menu-toggle]");

    const mobileMenu =
        document.querySelector("[data-mobile-menu]");


    if (menuToggle && mobileMenu) {
        const isMobileNavigation =
            window.matchMedia("(max-width: 1000px)");
        let menuOpener = null;
        let mobileMenuIsResponsive = false;

        function closeMenu({ restoreFocus = false } = {}) {

            mobileMenu.classList.remove("nav-open");

            menuToggle.classList.remove(
                "menu-active"
            );

            menuToggle.setAttribute(
                "aria-expanded",
                "false"
            );

            menuToggle.setAttribute(
                "aria-label",
                "Open menu"
            );

            navbar.classList.remove("menu-open");

            document.body.classList.remove(
                "menu-is-open"
            );

            if (restoreFocus) {
                (menuOpener || menuToggle).focus();
            }

            menuOpener = null;
            mobileMenuIsResponsive = false;
        }


        menuToggle.addEventListener(
            "click",
            event => {

                const isOpen =
                    mobileMenu.classList.toggle(
                        "nav-open"
                    );


                menuToggle.classList.toggle(
                    "menu-active",
                    isOpen
                );


                menuToggle.setAttribute(
                    "aria-expanded",
                    String(isOpen)
                );


                menuToggle.setAttribute(
                    "aria-label",
                    isOpen
                        ? "Close menu"
                        : "Open menu"
                );


                navbar.classList.toggle(
                    "menu-open",
                    isOpen
                );

                document.body.classList.toggle(
                    "menu-is-open",
                    isOpen
                );

                if (isOpen) {
                    menuOpener = menuToggle;
                    mobileMenuIsResponsive = isMobileNavigation.matches;

                    if (event.detail === 0 && mobileMenuIsResponsive) {
                        const firstFocusable = Array.from(
                            mobileMenu.querySelectorAll(
                                'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
                            )
                        ).find(element =>
                            element.getClientRects().length > 0 &&
                            getComputedStyle(element).visibility !== "hidden"
                        );

                        firstFocusable?.focus();
                    }
                } else {
                    if (event.detail === 0 && mobileMenuIsResponsive) {
                        (menuOpener || menuToggle).focus();
                    }

                    menuOpener = null;
                    mobileMenuIsResponsive = false;
                }

            }
        );


        mobileMenu
            .querySelectorAll("a")
            .forEach(link => {

                link.addEventListener(
                    "click",
                    event => closeMenu({
                        restoreFocus: event.detail === 0 &&
                            mobileMenuIsResponsive
                    })
                );

            });


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape" &&
                    mobileMenu.classList.contains("nav-open")
                ) {
                    event.preventDefault();
                    closeMenu({ restoreFocus: true });
                }

            }
        );

    }


    /* =====================================================
       SCROLL REVEALS
    ====================================================== */

    const revealItems =
        document.querySelectorAll(".reveal");


    if (
        "IntersectionObserver" in window
    ) {

        const revealObserver =
            new IntersectionObserver(
                entries => {

                    entries.forEach(entry => {

                        if (
                            !entry.isIntersecting
                        ) {
                            return;
                        }


                        entry.target
                            .classList
                            .add("is-visible");


                        revealObserver.unobserve(
                            entry.target
                        );

                    });

                },
                {
                    threshold: 0.12,
                    rootMargin:
                        "0px 0px -50px 0px"
                }
            );


        revealItems.forEach(item => {

            revealObserver.observe(item);

        });

    } else {

        revealItems.forEach(item => {

            item.classList.add(
                "is-visible"
            );

        });

    }


    /* =====================================================
       SMOOTH INTERNAL LINKS
    ====================================================== */

    document
        .querySelectorAll('a[href^="#"]')
        .forEach(link => {

            link.addEventListener(
                "click",
                event => {

                    const targetId =
                        link.getAttribute("href");


                    if (
                        !targetId ||
                        targetId === "#"
                    ) {
                        return;
                    }


                    const target =
                        document.querySelector(
                            targetId
                        );


                    if (!target) {
                        return;
                    }


                    event.preventDefault();


                    target.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }
            );

        });


    /* =====================================================
       LIGHT IMAGE PARALLAX
    ====================================================== */

    const parallaxImages =
        document.querySelectorAll(
            ".experience-media img, .gallery-item img, [data-story-parallax] img"
        );

    const storyTicker =
        document.querySelector("[data-story-ticker]");

    const storyTickerTrack =
        document.querySelector("[data-story-ticker-track]");


    const reducedMotion =
        window.matchMedia(
            "(prefers-reduced-motion: no-preference)"
        );

    const storyJourney =
        document.querySelector("[data-story-journey]");

    if (storyJourney) {
        const storyChapters = Array.from(
            storyJourney.querySelectorAll("[data-story-chapter]")
        );
        const storyFrames = Array.from(
            storyJourney.querySelectorAll("[data-story-frame]")
        ).filter(frame => frame instanceof HTMLImageElement);
        const storyFrameLabel =
            storyJourney.querySelector("[data-story-frame-label]");
        const wideStoryViewport =
            window.matchMedia("(min-width: 1001px)");
        let storyScrollEnhanced = false;
        let storyFramePending = false;

        function setActiveStoryChapter(index) {
            storyChapters.forEach((chapter, chapterIndex) => {
                const isActive = chapterIndex === index;
                chapter.classList.toggle("is-active", isActive);
                chapter.setAttribute("aria-hidden", String(!isActive));
            });

            storyFrames.forEach((frame, frameIndex) => {
                frame.classList.toggle("is-active", frameIndex === index);
            });

            storyJourney.style.setProperty(
                "--story-progress",
                String((index + 1) / storyChapters.length)
            );

            if (storyFrameLabel) {
                storyFrameLabel.textContent =
                    `${String(index + 1).padStart(2, "0")} / ${String(storyChapters.length).padStart(2, "0")}`;
            }
        }

        function updateStoryChapterFromScroll() {
            const scrollRange = storyJourney.offsetHeight - window.innerHeight;
            const progress = scrollRange > 0
                ? Math.max(
                    0,
                    Math.min(
                        .999999,
                        -storyJourney.getBoundingClientRect().top / scrollRange
                    )
                )
                : 0;
            const activeIndex = Math.min(
                storyChapters.length - 1,
                Math.floor(progress * storyChapters.length)
            );

            setActiveStoryChapter(activeIndex);
            storyFramePending = false;
        }

        function scheduleStoryChapterUpdate() {
            if (storyFramePending) return;

            storyFramePending = true;
            requestAnimationFrame(updateStoryChapterFromScroll);
        }

        function updateStoryMotionMode() {
            const shouldEnhance =
                reducedMotion.matches && wideStoryViewport.matches;

            if (shouldEnhance === storyScrollEnhanced) {
                return;
            }

            storyScrollEnhanced = shouldEnhance;
            document.body.classList.toggle(
                "story-scroll-enhanced",
                storyScrollEnhanced
            );

            if (storyScrollEnhanced) {
                setActiveStoryChapter(0);
                window.addEventListener(
                    "scroll",
                    scheduleStoryChapterUpdate,
                    { passive: true }
                );
                window.addEventListener("resize", scheduleStoryChapterUpdate);
                updateStoryChapterFromScroll();
                return;
            }

            window.removeEventListener("scroll", scheduleStoryChapterUpdate);
            window.removeEventListener("resize", scheduleStoryChapterUpdate);
            storyChapters.forEach(chapter => {
                chapter.classList.remove("is-active");
                chapter.removeAttribute("aria-hidden");
            });
            storyFrames.forEach(frame => frame.classList.remove("is-active"));
            storyJourney.style.removeProperty("--story-progress");
        }

        if (storyChapters.length && storyFrames.length === storyChapters.length) {
            updateStoryMotionMode();
            reducedMotion.addEventListener("change", updateStoryMotionMode);
            wideStoryViewport.addEventListener("change", updateStoryMotionMode);
        }
    }


    if (reducedMotion.matches) {

        let ticking = false;


        function updateParallax() {

            const viewportHeight =
                window.innerHeight;


            parallaxImages.forEach(image => {

                const parent =
                    image.parentElement;


                if (!parent) return;


                const rect =
                    parent.getBoundingClientRect();


                if (
                    rect.bottom < -100 ||
                    rect.top >
                        viewportHeight + 100
                ) {
                    return;
                }


                const progress =
                    (
                        viewportHeight -
                        rect.top
                    ) /
                    (
                        viewportHeight +
                        rect.height
                    );


                const isStoryImage = image.closest(".story-page");
                const travel = isStoryImage
                    ? Math.min(36, rect.height * .06)
                    : 18;
                const offset =
                    (progress - .5) * -travel;


                image.style.transform =
                    `scale(${isStoryImage ? 1.08 : 1.025})
                     translate3d(0, ${offset}px, 0)`;

            });

            if (storyTicker && storyTickerTrack) {
                const tickerBounds =
                    storyTicker.getBoundingClientRect();

                const progress = Math.max(
                    0,
                    Math.min(
                        1,
                        (viewportHeight - tickerBounds.top) /
                        (viewportHeight + tickerBounds.height)
                    )
                );

                const tickerDistance = Math.max(
                    0,
                    storyTickerTrack.scrollWidth -
                    storyTicker.clientWidth
                );
                const startOffset = Math.min(
                    window.innerWidth * .02,
                    tickerDistance
                );
                const endOffset = -tickerDistance;
                const offset =
                    startOffset +
                    (endOffset - startOffset) * progress;

                storyTickerTrack.style.transform =
                    `translate3d(${offset}px, 0, 0)`;
            }


            ticking = false;
        }


        window.addEventListener(
            "scroll",
            () => {

                if (!ticking) {

                    requestAnimationFrame(
                        updateParallax
                    );

                    ticking = true;
                }

            },
            { passive: true }
        );

        window.addEventListener(
            "resize",
            () => {

                if (!ticking) {
                    requestAnimationFrame(updateParallax);
                    ticking = true;
                }

            }
        );


        updateParallax();

    }

});
