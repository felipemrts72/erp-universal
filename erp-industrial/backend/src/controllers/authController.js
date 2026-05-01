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

  async me(req, res) {
    const result = await authService.me(req.user);
    res.json(result);
  },

  async listUsers(req, res) {
    const result = await authService.listUsers();
    res.json(result);
  },

  async listRoles(req, res) {
    const result = await authService.listRoles();
    res.json(result);
  },

  async createRole(req, res) {
    const result = await authService.createRole(req.body);
    res.status(201).json(result);
  },
};
