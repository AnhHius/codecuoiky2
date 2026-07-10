/**
 * Bọc các hàm controller bất đồng bộ (async) để tự động catch lỗi
 * và chuyển cho middleware errorHandler xử lý, tránh phải viết try-catch
 * lặp đi lặp lại trong từng controller (tuân thủ nguyên tắc DRY).
 *
 * Cách dùng:
 *   router.get('/rooms', catchAsync(roomController.getAllRooms));
 */
function catchAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = catchAsync;
