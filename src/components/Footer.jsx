/**
 * 页脚组件
 */
const Footer = () => {
  return (
    <footer className="footer footer-center p-4 bg-base-200 text-base-content">
      <div>
        <p>© {new Date().getFullYear()} 商品价格预测模型验证工具 - 基于 React + Supabase + CloudBase</p>
      </div>
    </footer>
  );
};

export default Footer;