
 
  let cropper;
  let currentFileIndex;
  let selectedFiles = [];
  let croppedImages = [];
  let cropperModal;
  
  document.addEventListener('DOMContentLoaded', function() {
  
    cropperModal = new bootstrap.Modal(document.getElementById('imageCropperModal'));
    

    document.querySelector('.upload-placeholder').addEventListener('click', function() {
      document.getElementById('productImages').click();
    });
    

    document.getElementById('productImages').addEventListener('change', function(event) {
      selectedFiles = Array.from(this.files);
      
      if (selectedFiles.length < 3) {
        alert('Please select at least 3 images for your book');
        this.value = '';
        return;
      }
      

      croppedImages = []; 
      currentFileIndex = 0;
      startCropping();
    });
    
t
    document.getElementById('cancelBtn').addEventListener('click', function() {
      if (confirm('Are you sure you want to cancel image cropping? You will need to select images again.')) {
        cropperModal.hide();
        if (cropper) {
          cropper.destroy();
          cropper = null;
        }
        document.getElementById('productImages').value = '';
        selectedFiles = [];
        croppedImages = [];
        currentFileIndex = 0;
        

        const previewArea = document.getElementById('imagePreviewArea');
        previewArea.innerHTML = `
          <div class="upload-placeholder d-flex align-items-center justify-content-center bg-light-brown rounded p-3 mb-2">
            <div class="text-center">
              <i class="fas fa-cloud-upload-alt fa-2x text-brown mb-2"></i>
              <p class="mb-0 small">Click to select at least 3 images</p>
            </div>
          </div>
        `;
      }
    });
    

    document.getElementById('closeModal').addEventListener('click', function() {
      document.getElementById('cancelBtn').click(); 
    });
    

    document.getElementById('cropImageBtn').addEventListener('click', function() {
      if (!cropper) return;
      
      const canvas = cropper.getCroppedCanvas({
        width: 800,   
        height: 800,  
        imageSmoothingQuality: 'high'
      });
      

      const croppedDataUrl = canvas.toDataURL('image/jpeg');
      

      croppedImages.push({
        dataUrl: croppedDataUrl,
        index: currentFileIndex,
        filename: selectedFiles[currentFileIndex].name
      });
      
    
      updateProgress();
      
     
      if (cropper) {
        cropper.destroy();
        cropper = null;
      }
      
      
      currentFileIndex++;
      
      
      if (currentFileIndex < selectedFiles.length) {
        
        processNextImage();
      } else {
        
        cropperModal.hide();
        displayCroppedImages();
      }
    });
    
    
    document.getElementById('addProductForm').addEventListener('submit', function(e) {
      e.preventDefault();
      
      if (croppedImages.length < 3) {
        alert('Please upload and crop at least 3 book images');
        return false;
      }
      
   
      showLoading('Saving book...');
      
     
      const formData = new FormData(this);
      
     
      formData.delete('productImages');
      
     
      const blobPromises = croppedImages.map((image, index) => {
        return fetch(image.dataUrl)
          .then(res => res.blob())
          .then(blob => {
            const filename = `book-image-${index+1}-${Date.now()}.jpg`;
            return new File([blob], filename, { type: 'image/jpeg' });
          });
      });
      
   
      Promise.all(blobPromises)
        .then(files => {
          files.forEach(file => {
            formData.append('productImages', file);
          });
          return submitFormWithFormData(formData);
        })
        .catch(error => {
          hideLoading();
          console.error('Error:', error);
          alert('There was an error processing your images. Please try again.');
        });
    });
  });
  
  function startCropping() {
   
    currentFileIndex = 0;
    processNextImage();
  }
  
  function processNextImage() {
    if (currentFileIndex >= selectedFiles.length) {
    
      displayCroppedImages();
      return;
    }
    
    const file = selectedFiles[currentFileIndex];
    
    if (!file.type.match('image.*')) {
      currentFileIndex++;
      processNextImage();
      return;
    }
    
   
    document.getElementById('currentImageNumber').textContent = 
      ` (${currentFileIndex + 1} of ${selectedFiles.length})`;
    
   
    updateProgress();
    
    const reader = new FileReader();
    reader.onload = function(e) {
      
      const cropperImage = document.getElementById('cropperImage');
      cropperImage.src = e.target.result;
      
     
      cropperModal.show();
      
     
      setTimeout(() => {
       
        cropper = new Cropper(cropperImage, {
          aspectRatio: 0, 
          viewMode: 2,   
          autoCropArea: 0.8,
          responsive: true,
          guides: true,
          center: true,
          highlight: false,
          cropBoxMovable: true,
          cropBoxResizable: true,
          toggleDragModeOnDblclick: false
        });
      }, 300);
    };
    
    reader.readAsDataURL(file);
  }
  
  function updateProgress() {
    const progressBar = document.getElementById('cropProgress');
    const percentage = ((currentFileIndex) / selectedFiles.length) * 100;
    progressBar.style.width = percentage + '%';
    progressBar.setAttribute('aria-valuenow', percentage);
  }
  
  function displayCroppedImages() {
    const previewArea = document.getElementById('imagePreviewArea');
    previewArea.innerHTML = ''; 
    
    croppedImages.forEach((image, index) => {
      const previewItem = document.createElement('div');
      previewItem.className = 'position-relative me-2 mb-2';
      previewItem.innerHTML = `
        <img src="${image.dataUrl}" class="image-preview-item shadow" data-index="${index}" title="Book image ${index + 1}">
        <div class="image-preview-remove" onclick="removePreview(${index})">
          <i class="fas fa-times fa-xs"></i>
        </div>
      `;
      previewArea.appendChild(previewItem);
    });
    
   
    const uploadMoreBtn = document.createElement('div');
    uploadMoreBtn.className = 'image-preview-item d-flex align-items-center justify-content-center bg-light-brown me-2 mb-2';
    uploadMoreBtn.style.cursor = 'pointer';
    uploadMoreBtn.innerHTML = '<i class="fas fa-plus text-brown"></i>';
    uploadMoreBtn.addEventListener('click', function() {
      document.getElementById('productImages').click();
    });
    previewArea.appendChild(uploadMoreBtn);
  }
  
  function removePreview(index) {
    croppedImages.splice(index, 1);
    displayCroppedImages();
  }
  
  function submitFormWithFormData(formData) {
    const actionUrl = document.getElementById('addProductForm').action;
    return fetch(actionUrl, {
      method: 'POST',
      body: formData
    })
    .then(response => {
      hideLoading();
      if (response.ok) {
        window.location.href = '/admin/products?success=Book added successfully';
      } else {
        throw new Error('Server error');
      }
    })
    .catch(error => {
      hideLoading();
      console.error('Error:', error);
      alert('There was an error adding the book. Please try again.');
    });
  }
  
  function showLoading(message) {
   
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="spinner mb-3"></div>
      <p class="text-brown">${message || 'Processing...'}</p>
    `;
    document.body.appendChild(overlay);
  }
  
  function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
      overlay.remove();
    }
  }
  
  window.removePreview = removePreview;
