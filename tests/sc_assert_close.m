function sc_assert_close(actual, expected, tol, msg)
    % SC_ASSERT_CLOSE Сравнение скаляров с допуском (верификация комплекса).
    if nargin < 3 || isempty(tol)
        tol = 1e-9;
    end
    if nargin < 4
        msg = '';
    end
    if ~(isfinite(actual) && isfinite(expected))
        error('VERIFY_FAIL: %s — нечисловое значение (actual=%s expected=%s)', ...
            msg, mat2str(actual), mat2str(expected));
    end
    if abs(actual - expected) > tol
        error('VERIFY_FAIL: %s — ожидалось %.14g, получено %.14g (допуск %.3g)', ...
            msg, expected, actual, tol);
    end
end
