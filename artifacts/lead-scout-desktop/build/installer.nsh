!define GWL_STYLE -16
!define WS_MINIMIZEBOX 0x00020000
!define WS_MAXIMIZEBOX 0x00010000
!define WS_THICKFRAME 0x00040000
!define SWP_REFRESH_FRAME 39

!macro customInit
  ; Keep the native close button and add working minimize/maximize controls
  ; to the non-one-click installer window.
  System::Call "user32::GetWindowLong(i $HWNDPARENT, i ${GWL_STYLE}) i .r0"
  IntOp $0 $0 | ${WS_MINIMIZEBOX}
  IntOp $0 $0 | ${WS_MAXIMIZEBOX}
  IntOp $0 $0 | ${WS_THICKFRAME}
  System::Call "user32::SetWindowLong(i $HWNDPARENT, i ${GWL_STYLE}, i r0)"
  System::Call "user32::SetWindowPos(i $HWNDPARENT, i 0, i 0, i 0, i 0, i ${SWP_REFRESH_FRAME})"
!macroend