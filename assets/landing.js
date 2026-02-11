// Landing page logic
document.getElementById('show-register').addEventListener('click', () => {
    window.location.href = '/app.html';
});

document.getElementById('show-login').addEventListener('click', () => {
    window.location.href = '/app.html?mode=login';
});

document.getElementById('landing-tos-link').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/app.html?tos=true';
});

document.getElementById('privacy-link').addEventListener('click', (e) => {
    e.preventDefault();
    alert('Privacy Policy: We do not share your data. All video sessions are P2P encrypted.');
});
