
  // Define variables for cropping
  let cropper;
  let currentFileIndex;
  let selectedFiles = [];
  let croppedImages = [];
  let cropperModal;
  
  document.addEventListener('DOMContentLoaded', function() {
    // Initialize modal
    cropperModal = new bootstrap.Modal(document.getElementById('imageCropperModal'));
    
    // Set up click on upload placeholder
    document.querySelector('.upload-placeholder').addEventListener('click', function() {
      document.getElementById('productImages').click();
    });
    
    // Image input change handler
    document.getElementById('productImages').addEventListener('change', function(event) {
      selectedFiles = Array.from(this.files);
      
      if (selectedFiles.length < 3) {
        alert('Please select at least 3 images for your book');
        this.value = '';
        return;
      }
      
      // Start cropping process
      croppedImages = []; // Reset cropped images
      currentFileIndex = 0;
      startCropping();
    });
    
    // Cancel button event
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
        
        // Reset preview area
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
    
    // Close modal button
    document.getElementById('closeModal').addEventListener('click', function() {
      document.getElementById('cancelBtn').click(); // Trigger cancel button
    });
    
    // Crop and continue button
    document.getElementById('cropImageBtn').addEventListener('click', function() {
      if (!cropper) return;
      
      const canvas = cropper.getCroppedCanvas({
        width: 800,   
        height: 800,  
        imageSmoothingQuality: 'high'
      });
      
      // Get the cropped image as a data URL
      const croppedDataUrl = canvas.toDataURL('image/jpeg');
      
      // Save this cropped image
      croppedImages.push({
        dataUrl: croppedDataUrl,
        index: currentFileIndex,
        filename: selectedFiles[currentFileIndex].name
      });
      
      // Update progress bar
      updateProgress();
      
      // Destroy current cropper instance
      if (cropper) {
        cropper.destroy();
        cropper = null;
      }
      
      // Move to next image
      currentFileIndex++;
      
      // Check if we have more images to process
      if (currentFileIndex < selectedFiles.length) {
        // Process next image
        processNextImage();
      } else {
        // All images processed, hide modal and display them
        cropperModal.hide();
        displayCroppedImages();
      }
    });
    
    // Form submission
    document.getElementById('addProductForm').addEventListener('submit', function(e) {
      e.preventDefault();
      
      if (croppedImages.length < 3) {
        alert('Please upload and crop at least 3 book images');
        return false;
      }
      
      // Show loading overlay
      showLoading('Saving book...');
      
      // Convert cropped images to Blob files and append to FormData
      const formData = new FormData(this);
      
      // Remove the original file input images
      formData.delete('productImages');
      
      // Create promises for all blob conversions
      const blobPromises = croppedImages.map((image, index) => {
        return fetch(image.dataUrl)
          .then(res => res.blob())
          .then(blob => {
            const filename = `book-image-${index+1}-${Date.now()}.jpg`;
            return new File([blob], filename, { type: 'image/jpeg' });
          });
      });
      
      // When all blobs are ready, add them to formData and submit
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
    // Start the cropping process with the first image
    currentFileIndex = 0;
    processNextImage();
  }
  
  function processNextImage() {
    if (currentFileIndex >= selectedFiles.length) {
      // All images processed, display them
      displayCroppedImages();
      return;
    }
    
    const file = selectedFiles[currentFileIndex];
    
    if (!file.type.match('image.*')) {
      currentFileIndex++;
      processNextImage();
      return;
    }
    
    // Update the modal title to show progress
    document.getElementById('currentImageNumber').textContent = 
      ` (${currentFileIndex + 1} of ${selectedFiles.length})`;
    
    // Update progress bar
    updateProgress();
    
    const reader = new FileReader();
    reader.onload = function(e) {
      // Set the image in the cropper
      const cropperImage = document.getElementById('cropperImage');
      cropperImage.src = e.target.result;
      
      // Show the modal
      cropperModal.show();
      
      // Initialize cropper after modal is shown
      setTimeout(() => {
        // Initialize cropper
        cropper = new Cropper(cropperImage, {
          aspectRatio: 0, // Square aspect ratio for book images
          viewMode: 2,    // Restrict the crop box to not exceed the size of the canvas
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
    previewArea.innerHTML = ''; // Clear existing previews
    
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
    
    // Add upload more button if needed
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
    // Create loading overlay
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
  
  // Make removePreview globally accessible for the onclick handler
  window.removePreview = removePreview;
