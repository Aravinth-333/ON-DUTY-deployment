const progress = document.getElementById('progress');
const circles = document.querySelectorAll('.circle');

let currentActive = 1;

function updateProgress() {
    circles.forEach((circle, idx) => {
        if (idx < currentActive) {
            circle.classList.add('active');
        } else {
            circle.classList.remove('active');
        }
    });

    const actives = document.querySelectorAll('.circle.active');
    progress.style.width = ((actives.length - 1) / (circles.length - 1)) * 150 + '%';
}

// Example to simulate progress
setTimeout(() => {
    currentActive++;
    updateProgress();
}, 1000);

setTimeout(() => {
    currentActive++;
    updateProgress();
}, 2000);
