document.addEventListener('DOMContentLoaded', function() {
  const toggleBtn = document.getElementById('toggleSidebar');
  const sidebar = document.getElementById('sidebar');
  
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', function() {
      // For mobile screens
      if (window.innerWidth <= 768) {
        sidebar.classList.toggle('show');
      } else {
        // For desktop screens
        if (getComputedStyle(sidebar).display === 'none') {
          sidebar.style.display = 'block';
        } else {
          sidebar.style.display = 'none';
        }
      }
    });
  }
  
  // Handle window resize
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768 && sidebar) {
      sidebar.classList.remove('show');
      sidebar.style.display = 'block';
    } else if (window.innerWidth <= 768 && sidebar) {
      sidebar.style.display = 'block'; // Reset inline style
    }
  });
  
  // Close sidebar on mobile when clicking outside
  document.addEventListener('click', function(event) {
    if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('show')) {
      if (!sidebar.contains(event.target) && !toggleBtn.contains(event.target)) {
        sidebar.classList.remove('show');
      }
    }
  });
});
