
document.getElementById("studentlogin").addEventListener('click', function(event) {
    event.preventDefault();
    window.location.href = "http://localhost:3039/login1.html"; // Redirect to backend server
});

document.getElementById("facultylogin").addEventListener('click', function(event) {
    event.preventDefault();
    window.location.href = "http://localhost:3059/facultylogin.html"; // Redirect to backend server
});

document.getElementById("navbar-toggle").addEventListener("click", function() {
    var menu = document.getElementById("navbar-menu");
    menu.classList.toggle("active");
});
