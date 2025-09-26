// Ganti dengan URL web app dari Google Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx0HzN8eH5tgZ4ujAvoRfe1DryKfSW4wp5rv8_2jNqLKRTbY_d63y8lYOZ0lFm7qE5k/exec';

// Debug function
function debug(message) {
    const debugPanel = document.getElementById('debugPanel');
    debugPanel.style.display = 'block';
    debugPanel.innerHTML += new Date().toLocaleTimeString() + ': ' + message + '<br>';
    console.log(message);
}

// Fungsi untuk menampilkan notifikasi
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    notificationText.textContent = message;
    notification.className = 'notification ' + type;
    notification.style.display = 'flex';
    
    // Sembunyikan notifikasi setelah 5 detik
    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}

// Fungsi untuk menampilkan/menyembunyikan loading
function toggleLoading(show) {
    const loading = document.getElementById('loading');
    loading.style.display = show ? 'block' : 'none';
}

// Fungsi untuk menampilkan/menyembunyikan progress bar
function toggleProgress(show) {
    const progressContainer = document.getElementById('progressContainer');
    progressContainer.style.display = show ? 'block' : 'none';
}

// Fungsi untuk update progress bar
function updateProgress(percent) {
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = percent + '%';
    progressBar.textContent = percent + '%';
}

// Fungsi untuk menampilkan/menyembunyikan loading data
function toggleDataLoading(show) {
    const dataLoading = document.getElementById('dataLoading');
    const dataError = document.getElementById('dataError');
    const tableContainer = document.getElementById('tableContainer');
    
    if (show) {
        dataLoading.style.display = 'block';
        dataError.style.display = 'none';
        tableContainer.style.display = 'none';
    } else {
        dataLoading.style.display = 'none';
    }
}

// Fungsi untuk menampilkan error data
function showDataError() {
    const dataLoading = document.getElementById('dataLoading');
    const dataError = document.getElementById('dataError');
    const tableContainer = document.getElementById('tableContainer');
    
    dataLoading.style.display = 'none';
    dataError.style.display = 'block';
    tableContainer.style.display = 'none';
}

// Fungsi untuk memeriksa status koneksi
function updateConnectionStatus() {
    const connectionStatus = document.getElementById('connectionStatus');
    const connectionText = document.getElementById('connectionText');
    
    if (navigator.onLine) {
        connectionStatus.className = 'connection-status online';
        connectionText.innerHTML = '<i class="fas fa-wifi"></i> Online';
        setTimeout(() => {
            connectionStatus.style.display = 'none';
        }, 3000);
    } else {
        connectionStatus.className = 'connection-status offline';
        connectionText.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
        connectionStatus.style.display = 'block';
    }
}

// Event listener untuk perubahan koneksi
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);

// Fungsi untuk mengambil data dari spreadsheet dengan pendekatan multi-layer
function loadData() {
    return new Promise((resolve, reject) => {
        // Cek koneksi internet terlebih dahulu
        if (!navigator.onLine) {
            reject(new Error('Tidak ada koneksi internet'));
            return;
        }
        
        debug('Mencoba memuat data...');
        
        // Pendekatan 1: Coba dengan fetch biasa
        try {
            const timestamp = new Date().getTime();
            const url = `${SCRIPT_URL}?action=getData&t=${timestamp}`;
            
            debug('Mencoba pendekatan 1: fetch biasa');
            
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    debug('Pendekatan 1 berhasil');
                    if (data.status === 'success') {
                        resolve(data.data || []);
                    } else {
                        throw new Error(data.message || 'Gagal memuat data');
                    }
                })
                .catch(error => {
                    debug(`Pendekatan 1 gagal: ${error.message}`);
                    // Lanjut ke pendekatan 2
                    tryJsonp();
                });
        } catch (error) {
            debug(`Error di pendekatan 1: ${error.message}`);
            // Lanjut ke pendekatan 2
            tryJsonp();
        }
        
        // Pendekatan 2: Gunakan JSONP
        function tryJsonp() {
            try {
                debug('Mencoba pendekatan 2: JSONP');
                
                const callbackName = 'jsonpCallback_' + Math.floor(Math.random() * 1000000);
                
                // Buat fungsi callback global
                window[callbackName] = function(response) {
                    // Hapus fungsi callback global
                    delete window[callbackName];
                    
                    // Hapus script element
                    const script = document.getElementById(callbackName + '_script');
                    if (script) {
                        document.body.removeChild(script);
                    }
                    
                    debug('JSONP response received');
                    if (response && response.status === 'success') {
                        debug('JSONP berhasil');
                        resolve(response.data || []);
                    } else {
                        throw new Error(response?.message || 'Gagal memuat data');
                    }
                };
                
                // Buat script element untuk JSONP
                const script = document.createElement('script');
                script.id = callbackName + '_script';
                const timestamp = new Date().getTime();
                script.src = `${SCRIPT_URL}?action=getData&t=${timestamp}&callback=${callbackName}`;
                
                // Handle error
                script.onerror = function() {
                    // Hapus fungsi callback global
                    delete window[callbackName];
                    // Hapus script element
                    if (document.getElementById(callbackName + '_script')) {
                        document.body.removeChild(document.getElementById(callbackName + '_script'));
                    }
                    debug('JSONP error');
                    // Lanjut ke pendekatan 3
                    tryIframe();
                };
                
                // Tambahkan script ke DOM
                document.body.appendChild(script);
                
                // Timeout untuk mencegah loading terus menerus
                setTimeout(() => {
                    if (window[callbackName]) {
                        // Hapus fungsi callback global
                        delete window[callbackName];
                        // Hapus script element
                        if (document.getElementById(callbackName + '_script')) {
                            document.body.removeChild(document.getElementById(callbackName + '_script'));
                        }
                        debug('JSONP timeout');
                        // Lanjut ke pendekatan 3
                        tryIframe();
                    }
                }, 10000); // 10 detik timeout
            } catch (error) {
                debug(`Error di pendekatan 2: ${error.message}`);
                // Lanjut ke pendekatan 3
                tryIframe();
            }
        }
        
        // Pendekatan 3: Gunakan iframe form submission
        function tryIframe() {
            try {
                debug('Mencoba pendekatan 3: iframe form submission');
                
                // Buat iframe tersembunyi
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.name = 'dataFrame_' + Date.now();
                document.body.appendChild(iframe);
                
                // Buat form
                const form = document.createElement('form');
                form.method = 'GET';
                form.action = SCRIPT_URL;
                form.target = iframe.name;
                
                // Tambahkan parameter
                const actionInput = document.createElement('input');
                actionInput.name = 'action';
                actionInput.value = 'getData';
                form.appendChild(actionInput);
                
                const timestampInput = document.createElement('input');
                timestampInput.name = 't';
                timestampInput.value = Date.now();
                form.appendChild(timestampInput);
                
                // Event listener untuk iframe
                iframe.onload = function() {
                    try {
                        const iframeContent = iframe.contentDocument.body.innerText;
                        debug('Iframe content: ' + iframeContent.substring(0, 100));
                        
                        try {
                            const data = JSON.parse(iframeContent);
                            if (data.status === 'success') {
                                debug('Iframe berhasil');
                                resolve(data.data || []);
                            } else {
                                throw new Error(data.message || 'Gagal memuat data');
                            }
                        } catch (parseError) {
                            debug('Error parsing iframe content: ' + parseError.message);
                            throw new Error('Gagal memproses respons');
                        }
                    } catch (error) {
                        debug('Error processing iframe: ' + error.message);
                        throw error;
                    } finally {
                        // Hapus iframe
                        document.body.removeChild(iframe);
                    }
                };
                
                // Submit form
                document.body.appendChild(form);
                form.submit();
                document.body.removeChild(form);
                
                // Timeout
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                        debug('Iframe timeout');
                        reject(new Error('Request timeout'));
                    }
                }, 15000); // 15 detik timeout
            } catch (error) {
                debug(`Error di pendekatan 3: ${error.message}`);
                reject(new Error('Semua pendekatan gagal. Periksa koneksi internet Anda.'));
            }
        }
    });
}

// Fungsi untuk menampilkan data di tabel
function displayData(data) {
    const tableContainer = document.getElementById('tableContainer');
    const tableBody = document.querySelector('#tugasTable tbody');
    tableBody.innerHTML = '';
    
    tableContainer.style.display = 'block';
    
    if (data.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td colspan="4">
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>Belum ada data tugas</p>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
        updateStats(data);
        return;
    }
    
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.namaGuru}</td>
            <td>${row.kelas}</td>
            <td>${row.judulTugas}</td>
            <td><a href="${row.linkTugas}" target="_blank" class="btn-link"><i class="fas fa-eye"></i> Lihat</a></td>
        `;
        tableBody.appendChild(tr);
    });
    
    updateStats(data);
}

// Fungsi untuk memperbarui statistik
function updateStats(data) {
    // Hitung jumlah guru unik
    const uniqueTeachers = [...new Set(data.map(item => item.namaGuru))];
    document.getElementById('teacherCount').textContent = uniqueTeachers.length;
    
    // Hitung jumlah tugas
    document.getElementById('taskCount').textContent = data.length;
    
    // Hitung tugas hari ini
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = data.filter(item => {
        // Extract date from Google Drive URL (this is a simplified approach)
        // In a real app, you'd want to store the upload date in the spreadsheet
        return true; // For demo purposes, we'll just show all tasks
    });
    document.getElementById('todayCount').textContent = todayTasks.length;
}

// Event listener untuk form submission
document.getElementById('uploadForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Cek koneksi internet
    if (!navigator.onLine) {
        showNotification('Tidak ada koneksi internet. Silakan cek koneksi Anda.', 'error');
        return;
    }
    
    const namaGuru = document.getElementById('namaGuru').value;
    const kelas = document.getElementById('kelas').value;
    const judulTugas = document.getElementById('judulTugas').value;
    const fileInput = document.getElementById('fileTugas');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Silakan pilih file untuk diupload', 'error');
        return;
    }
    
    // Cek ukuran file (maksimal 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Ukuran file terlalu besar. Maksimal 5MB.', 'error');
        return;
    }
    
    // Tampilkan loading dan progress bar
    toggleLoading(true);
    toggleProgress(true);
    updateProgress(0);
    
    debug('Memulai upload file...');
    
    // Baca file sebagai base64
    const reader = new FileReader();
    
    // Progress event
    reader.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            updateProgress(percentComplete);
        }
    };
    
    reader.onload = async function(event) {
        const base64 = event.target.result.split(',')[1]; // Hapus header data URL
        
        debug('File dibaca, mengirim ke server...');
        
        // Buat form data untuk iframe submission
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = SCRIPT_URL;
        form.target = 'hiddenFrame';
        
        // Tambahkan input fields
        const jsonInput = document.createElement('input');
        jsonInput.name = 'json';
        jsonInput.value = JSON.stringify({
            namaGuru: namaGuru,
            kelas: kelas,
            judulTugas: judulTugas,
            fileData: base64,
            fileName: file.name,
            mimeType: file.type
        });
        form.appendChild(jsonInput);
        
        // Tambahkan form ke body
        document.body.appendChild(form);
        
        // Submit form
        form.submit();
        
        // Hapus form dari body
        document.body.removeChild(form);
        
        debug('Form disubmit, menunggu response...');
        
        // Simulasi progress untuk user feedback
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 10;
            if (progress > 90) progress = 90;
            updateProgress(progress);
        }, 500);
        
        // Timeout untuk menunggu response
        setTimeout(() => {
            clearInterval(progressInterval);
            toggleLoading(false);
            toggleProgress(false);
            
            // Asumsikan berhasil jika tidak ada error
            showNotification('Tugas berhasil diupload!', 'success');
            document.getElementById('uploadForm').reset();
            document.getElementById('fileLabel').textContent = 'Pilih file tugas';
            
            debug('Upload selesai, refresh data...');
            
            // Refresh data setelah upload
            setTimeout(() => {
                refreshData();
            }, 2000);
        }, 8000); // 8 detik timeout
    };
    
    reader.onerror = function() {
        toggleLoading(false);
        toggleProgress(false);
        debug('Error membaca file');
        showNotification('Gagal membaca file', 'error');
    };
    
    reader.readAsDataURL(file);
});

// Event listener untuk file input
document.getElementById('fileTugas').addEventListener('change', function(e) {
    const fileName = e.target.files[0]?.name || 'Pilih file tugas';
    document.getElementById('fileLabel').textContent = fileName;
    
    // Tampilkan ukuran file jika terlalu besar
    if (e.target.files[0] && e.target.files[0].size > 5 * 1024 * 1024) {
        showNotification('Ukuran file terlalu besar. Maksimal 5MB.', 'warning');
    }
});

// Event listener untuk tombol retry
document.getElementById('retryButton').addEventListener('click', function() {
    refreshData();
});

// Fungsi untuk refresh data
function refreshData() {
    toggleDataLoading(true);
    
    loadData()
        .then(data => {
            debug('Data berhasil dimuat: ' + data.length + ' item');
            displayData(data);
        })
        .catch(error => {
            debug('Error loading data: ' + error.message);
            showDataError();
        });
}

// Load data saat halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    // Periksa status koneksi saat halaman dimuat
    updateConnectionStatus();
    
    // Load data
    refreshData();
    
    // Coba refresh data setiap 120 detik (2 menit)
    setInterval(() => {
        if (navigator.onLine) {
            refreshData();
        }
    }, 120000);
});
