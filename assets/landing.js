// Landing page logic
document.getElementById('show-register').addEventListener('click', () => {
    window.location.href = '/register.html';
});

document.getElementById('show-login').addEventListener('click', () => {
    window.location.href = '/login.html';
});

document.getElementById('landing-tos-link').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/register.html';
});

document.getElementById('privacy-link').addEventListener('click', (e) => {
    e.preventDefault();
    alert('Privacy Policy: We do not share your data. All video sessions are P2P encrypted.');
});
