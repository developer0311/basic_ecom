let dropdown = document.querySelectorAll(".dropdown")[0];
let downArrow = document.querySelector("#downArrow");
let dropdownMenu = document.querySelectorAll(".dropdown-menu")

// Toggle arrow rotation when dropdown is clicked
dropdown.addEventListener('click', function(event) {
    event.stopPropagation(); // Prevent event from bubbling up to the document
    if (downArrow.style.transform === "rotate(180deg)") {
        downArrow.style.transform = "rotate(0deg)"; // Arrow points down
    } else {
        downArrow.style.transform = "rotate(180deg)"; // Arrow points up
    }
});

// Add an event listener to the whole document to reset the arrow when clicking outside dropdown
document.addEventListener('click', function() {
    if (downArrow.style.transform === "rotate(180deg)") {
        downArrow.style.transform = "rotate(0deg)"; // Reset the arrow back down
    }
});

// Prevent the arrow from resetting when clicking inside the dropdown options
dropdown.querySelectorAll(".dropdown-item").forEach(function(option) {
    option.addEventListener('click', function(event) {
        event.stopPropagation(); // Keep the arrow up when clicking inside the dropdown options
    });
});

dropdownMenu.forEach((elem)=>{
    elem.addEventListener('click', (event)=> {
        event.stopPropagation(); // Keep the arrow up when clicking inside the dropdown options
    });
})



// Select all carousel containers
const carousels = document.querySelectorAll('.home-product-cards-wrapper');

// Loop through each carousel and set up functionality
carousels.forEach((carousel) => {
    // Select necessary elements from the DOM for this carousel
    const cardsContainer = carousel.querySelector('.home-product-cards');
    const cardItems = carousel.querySelectorAll('.card-items');
    const leftBtn = carousel.querySelector('.carousel-btn:nth-of-type(1)'); // Left button
    const rightBtn = carousel.querySelector('.carousel-btn:nth-of-type(2)'); // Right button

    // Initialize variables
    let currentIndex = 0;
    let cardsToShow = 5; // Default visible cards (for >1200px)
    const totalCards = cardItems.length;

    // Function to calculate the width of the visible cards
    function calculateCardWidth() {
        const containerWidth = cardsContainer.offsetWidth;
        return containerWidth / cardsToShow; // Width for each card based on container
    }

    // Adjust the number of cards shown based on screen width
    function adjustCardsToShow() {
        if (window.innerWidth < 950) {
            cardsToShow = 3; // 3 cards in view for smaller screens
        } else if (window.innerWidth < 1200) {
            cardsToShow = 4; // 4 cards in view between 950px and 1200px
        } else {
            cardsToShow = 5; // 5 cards in view for larger screens
        }
    }

    // Function to update button visibility based on current index
    function updateButtons() {
        leftBtn.style.display = currentIndex === 0 ? 'none' : 'block';
        rightBtn.style.display = currentIndex + cardsToShow >= totalCards ? 'none' : 'block';
    }

    // Function to slide cards based on the current index
    function slideCards() {
        const cardWidth = calculateCardWidth();
        const translateX = -currentIndex * cardWidth; // Calculate translation
        cardsContainer.style.transform = `translateX(${translateX}px)`; // Apply translation
        updateButtons(); // Update button visibility
    }

    // Event listener for the right button (next cards)
    rightBtn.addEventListener('click', () => {
        // Only move forward if we haven't reached the last set of cards
        if (currentIndex + cardsToShow < totalCards) {
            currentIndex++;
            slideCards(); // Slide cards forward
        }
    });

    // Event listener for the left button (previous cards)
    leftBtn.addEventListener('click', () => {
        // Only move backward if we're not at the first set of cards
        if (currentIndex > 0) {
            currentIndex--;
            slideCards(); // Slide cards backward
        }
    });

    // Initialize the carousel on page load
    adjustCardsToShow(); // Adjust the number of visible cards based on screen width
    updateButtons(); // Set initial button visibility
    slideCards(); // Slide to the starting position

    // Re-adjust the layout when the window is resized
    window.addEventListener('resize', () => {
        adjustCardsToShow();
        slideCards(); // Adjust sliding after resize
    });
});

