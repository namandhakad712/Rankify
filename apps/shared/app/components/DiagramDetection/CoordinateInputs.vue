<template>
  <div class="coordinate-inputs">
    <div class="input-header">
      <h4>Coordinate Editor</h4>
      <div class="input-actions">
        <button 
          class="btn btn-sm btn-secondary"
          @click="resetToOriginal"
          :disabled="!hasChanges"
   