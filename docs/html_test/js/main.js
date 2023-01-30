const toggleButton = document.getElementById('toggle-sidebar');
const sidebar = document.querySelector('#sidebar');

toggleButton.addEventListener('click', function() {
  if (sidebar.style.display === "none") {
    sidebar.style.display = "block";
    toggleButton.innerHTML = "Hide Sidebar";
  } else {
    sidebar.style.display = "none";
    toggleButton.innerHTML = "Show Sidebar";
  }
});