import { Router } from 'express';
import * as productService from '../services/product.service';
import { asyncHandler } from '../middleware/async-handler';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/', asyncHandler(async (req, res) => {
  const { task_id, product_type, url, description, version } = req.body;
  if (!task_id || !product_type || !url) {
    res.status(400).json({ error: 'task_id, product_type, url are required' });
    return;
  }
  const product = await productService.publishProduct({
    taskId: task_id,
    productType: product_type,
    url,
    description,
    version,
  });
  res.json(product);
}));

router.get('/', asyncHandler(async (req, res) => {
  const products = await productService.getAllProducts();
  res.json(products);
}));

router.get('/:taskId', asyncHandler(async (req, res) => {
  const taskId = req.params.taskId as string;
  const productType = typeof req.query.product_type === 'string' ? req.query.product_type : undefined;
  const products = await productService.getTaskProducts(taskId, productType);
  res.json(products);
}));

// ---- 超级管理员操作 ---- //

router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  await productService.deleteProduct(id);
  res.json({ message: '产物已删除', id });
}));

router.put('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const { product_type, url, description } = req.body;
  const product = await productService.updateProduct(id, {
    productType: product_type,
    url,
    description,
  });
  res.json(product);
}));

export default router;
