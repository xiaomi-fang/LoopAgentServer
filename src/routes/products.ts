import { Router } from 'express';
import * as productService from '../services/product.service';
import { asyncHandler } from '../middleware/async-handler';

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

router.get('/:taskId', asyncHandler(async (req, res) => {
  const productType = typeof req.query.product_type === 'string' ? req.query.product_type : undefined;
  const products = await productService.getTaskProducts(req.params.taskId as string, productType);
  res.json(products);
}));

export default router;
