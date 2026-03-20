import { authService } from '../services/authService.js';

export const authController = {
  async login(req, res) {
    const result = await authService.login(req.body.email, req.body.senha);

    res.json(result);
  },

  async register(req, res) {
    const result = await authService.register(req.body, req.user);
    res.status(201).json(result);
  },
};
