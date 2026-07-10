/**
 * ServiceCatalog Service - business logic cho quản lý danh mục dịch vụ
 * (đặt tên là serviceCatalog để tránh nhầm lẫn với từ "service" trong kiến trúc)
 */
const serviceModel = require('../models/service.model');
const { ConflictError, NotFoundError } = require('../errors/AppError');
const logger = require('../utils/logger');

async function getAllServices(query) {
  const { page, limit, category, search } = query;
  const { data, total } = await serviceModel.findAllPaginated({ page, limit, category, search });
  return { services: data, pagination: { page, limit, total } };
}

async function getServiceById(id) {
  const service = await serviceModel.findById(id);
  if (!service) throw new NotFoundError('Dịch vụ');
  return service;
}

async function createService(payload) {
  const exists = await serviceModel.nameExists(payload.name);
  if (exists) throw new ConflictError('Tên dịch vụ này đã tồn tại');

  const service = await serviceModel.create({
    name: payload.name,
    description: payload.description || null,
    category: payload.category,
    unit_price: payload.unitPrice,
    unit: payload.unit || 'lần',
  });

  logger.info('Tạo dịch vụ mới', { serviceId: service.id, name: service.name });
  return service;
}

async function updateService(id, payload) {
  const existing = await serviceModel.findById(id);
  if (!existing) throw new NotFoundError('Dịch vụ');

  if (payload.name) {
    const nameTaken = await serviceModel.nameExists(payload.name, id);
    if (nameTaken) throw new ConflictError('Tên dịch vụ này đã tồn tại');
  }

  const updateData = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.category !== undefined) updateData.category = payload.category;
  if (payload.unitPrice !== undefined) updateData.unit_price = payload.unitPrice;
  if (payload.unit !== undefined) updateData.unit = payload.unit;

  const updated = await serviceModel.update(id, updateData);
  logger.info('Cập nhật dịch vụ', { serviceId: id });
  return updated;
}

async function deleteService(id) {
  const existing = await serviceModel.findById(id);
  if (!existing) throw new NotFoundError('Dịch vụ');

  await serviceModel.softDelete(id);
  logger.info('Vô hiệu hóa dịch vụ', { serviceId: id });
}

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
};
